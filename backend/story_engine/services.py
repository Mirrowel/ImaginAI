from __future__ import annotations

import asyncio
import json
import re
from dataclasses import dataclass
from decimal import Decimal
from typing import AsyncGenerator

from django.conf import settings
from django.db import transaction
from django.utils import timezone
from ninja.errors import HttpError

from adventures.models import Adventure, AdventureTurn, GenerationVariant, PromptSnapshot, ResponseGroup, TokenUsage
from adventures.services import AdventureStateService, TurnService, next_timeline, next_turn_sequence
from ai_providers.models import ModelConfig, OwnerScope
from ai_providers.services import ModelConfigService


BASE_SYSTEM_INSTRUCTION = (
    "You are ImaginAI's story engine: continue an immersive interactive fiction adventure. "
    "Honor the scenario, maintain continuity, respond with vivid prose, and do not decide player intent beyond the submitted action."
)


def estimate_tokens(text: str) -> int:
    """Estimate tokens cheaply for context budgeting without provider-specific tokenizers."""
    if not text:
        return 0
    return max(1, len(re.findall(r"\S+", text)) * 4 // 3)


def sse(event: dict) -> str:
    """Serialize a generation event into the text/event-stream data format."""
    return f"data: {json.dumps(event, default=str)}\n\n"


@dataclass
class PromptLayer:
    """Prompt layer with debug metadata used for context reports and snapshots."""

    label: str
    role: str
    content: str
    priority: int
    source_type: str
    source_id: str | None = None

    def tokens(self) -> int:
        """Return the estimated token count for this prompt layer."""
        return estimate_tokens(self.content)


class CardActivationService:
    """Selects active cards by mode, triggers, and priority instead of injecting all cards."""

    @staticmethod
    def activate(cards: list[dict], current_text: str, recent_turns: list[AdventureTurn], retry_instruction: str = "") -> list[dict]:
        """Return enabled cards whose activation mode applies to current context."""
        haystack = "\n".join([current_text, retry_instruction] + [turn.content for turn in recent_turns[-8:]]).lower()
        active: list[dict] = []
        for card in cards:
            if not card.get("isEnabled", True):
                continue
            mode = card.get("activationMode") or "triggered"
            if mode == "disabled":
                continue
            if mode in {"always", "manual"}:
                active.append(card)
                continue
            if mode == "triggered" and CardActivationService._matches(card.get("triggerWords") or [], haystack):
                active.append(card)
        return sorted(active, key=lambda item: (item.get("priority", 100), item.get("sortOrder", 0), item.get("title", "")))

    @staticmethod
    def _matches(trigger_words: list[str], haystack: str) -> bool:
        """Match trigger phrases case-insensitively with word boundaries when safe."""
        for trigger in trigger_words:
            phrase = str(trigger).strip().lower()
            if not phrase:
                continue
            if re.search(rf"(?<!\w){re.escape(phrase)}(?!\w)", haystack):
                return True
        return False


class ContextBudgetService:
    """Applies effective model/user context limits and drops old turns instead of compressing them."""

    @staticmethod
    def effective_limit(model_config: ModelConfig, requested_limit: int | None = None) -> int:
        """Return min(model context window, user/default requested context limit)."""
        user_limit = requested_limit or model_config.user_context_limit_default or model_config.context_window
        return min(model_config.context_window, user_limit)

    @staticmethod
    def select_layers(layers: list[PromptLayer], model_config: ModelConfig, requested_limit: int | None = None) -> tuple[list[PromptLayer], dict]:
        """Select layers by priority while reserving room for visible output and safety margin."""
        limit = ContextBudgetService.effective_limit(model_config, requested_limit)
        reserve = model_config.visible_response_target_tokens + 256 + (model_config.thinking_budget or 0)
        budget = max(1024, limit - reserve)
        selected: list[PromptLayer] = []
        used = 0
        for layer in sorted(layers, key=lambda layer: layer.priority):
            cost = layer.tokens()
            if used + cost <= budget or layer.priority <= 20:
                selected.append(layer)
                used += cost
        estimates = {layer.label: layer.tokens() for layer in selected}
        estimates["total"] = used
        estimates["effectiveLimit"] = limit
        estimates["reservedForResponseAndSafety"] = reserve
        return selected, estimates


class PromptBuilder:
    """Builds explicit prompt layers for story generation and prompt inspection."""

    @staticmethod
    def build(adventure: Adventure, state, model_config: ModelConfig, intent: str, action_type: str = "", content: str = "", retry_instruction: str = "", include_variant_ids: list[str] | None = None, context_limit: int | None = None) -> tuple[list[dict], dict]:
        """Assemble messages and debug metadata from state, cards, summaries, memories, and turns."""
        active_turns = list(TurnService.active_turns(adventure).select_related("response_group"))
        activated_cards = CardActivationService.activate(state.cards, content, active_turns, retry_instruction)
        layers: list[PromptLayer] = [PromptLayer("base_system", "system", BASE_SYSTEM_INSTRUCTION, 1, "system")]
        if model_config.additional_system_prompt:
            layers.append(PromptLayer("model_additional_system", "system", model_config.additional_system_prompt, 5, "model_config", str(model_config.id)))
        for module in state.modules:
            if module.get("isEnabled", True) and module.get("moduleType") != "opening_scene":
                layers.append(PromptLayer(f"module:{module.get('moduleType')}", "system", module.get("content") or "", 10, "module", module.get("id")))
        for card in activated_cards:
            card_text = f"{card.get('title')} ({card.get('cardType')}): {card.get('summary')}\n{card.get('content')}".strip()
            layers.append(PromptLayer(f"card:{card.get('title')}", "system", card_text, 40 + int(card.get("priority", 100)), "story_card", card.get("id")))
        if hasattr(adventure, "summary") and adventure.summary.content:
            layers.append(PromptLayer("adventure_summary", "system", adventure.summary.content, 30, "summary", str(adventure.summary.id)))
        for memory in adventure.memories.filter(is_pinned=True):
            layers.append(PromptLayer(f"memory:{memory.title}", "system", memory.content, 45, "memory", str(memory.id)))
        for turn in active_turns:
            role = "assistant" if turn.role == AdventureTurn.Role.ASSISTANT else "user"
            prefix = PromptBuilder.format_action(turn.action_type, turn.content) if role == "user" else turn.content
            layers.append(PromptLayer(f"turn:{turn.sequence}", role, prefix, 80 + max(0, 1000 - turn.sequence), "turn", str(turn.id)))
        if retry_instruction:
            layers.append(PromptLayer("retry_guidance", "system", f"Retry guidance: {retry_instruction}\nPrevious rejected variants are non-canonical and only guidance.", 15, "retry"))
        if include_variant_ids:
            variants = GenerationVariant.objects.filter(id__in=include_variant_ids, adventure=adventure)
            for variant in variants:
                layers.append(PromptLayer(f"rejected_variant:{variant.id}", "system", variant.content, 60, "variant", str(variant.id)))
        if content:
            layers.append(PromptLayer("current_player_action", "user", PromptBuilder.format_action(action_type, content), 2, "current_action"))
        elif intent == "continue":
            layers.append(PromptLayer("continue_instruction", "user", "Continue the story from the latest assistant turn.", 2, "current_action"))
        selected, estimates = ContextBudgetService.select_layers(layers, model_config, context_limit)
        messages = [{"role": layer.role, "content": layer.content} for layer in selected if layer.content]
        debug = {
            "estimatedTokensByLayer": estimates,
            "includedModules": [layer.source_id for layer in selected if layer.source_type == "module"],
            "activatedCards": [card.get("id") for card in activated_cards],
            "includedSummaryIds": [layer.source_id for layer in selected if layer.source_type == "summary"],
            "includedMemoryIds": [layer.source_id for layer in selected if layer.source_type == "memory"],
            "includedTurnRange": PromptBuilder._turn_range(selected),
        }
        return messages, debug

    @staticmethod
    def format_action(action_type: str, content: str) -> str:
        """Format Do/Say/Story actions so the model distinguishes speech from narration."""
        if action_type == "say":
            return f'Player says: "{content}"'
        if action_type == "do":
            return f"Player action: {content}"
        if action_type == "story":
            return f"Player narrative direction: {content}"
        return content

    @staticmethod
    def _turn_range(layers: list[PromptLayer]) -> dict:
        """Return the included active turn sequence range for context inspection."""
        sequences = []
        for layer in layers:
            if layer.source_type == "turn" and layer.label.startswith("turn:"):
                sequences.append(int(layer.label.split(":", 1)[1]))
        return {"first": min(sequences) if sequences else None, "last": max(sequences) if sequences else None}


class ResponsePostProcessor:
    """Controls visible story length with sentence/paragraph-aware trimming."""

    @staticmethod
    def trim(text: str, target_tokens: int) -> str:
        """Trim long model output near a coherent sentence or paragraph boundary."""
        words = text.strip().split()
        if len(words) <= target_tokens:
            return text.strip()
        rough = " ".join(words[:target_tokens])
        boundary = max(rough.rfind(". "), rough.rfind("! "), rough.rfind("? "), rough.rfind("\n\n"))
        if boundary > max(80, len(rough) // 2):
            return rough[: boundary + 1].strip()
        return rough.rstrip(",;:- ") + "..."


class RotatorGateway:
    """Only boundary allowed to call rotator_library; it enforces model/credential scope first."""

    async def complete(self, user, model_config: ModelConfig, messages: list[dict], stream: bool = False, generation_params: dict | None = None):
        """Call rotator_library with scoped private credentials or return fake text in dev mode."""
        if settings.IMAGINAI_FAKE_LLM:
            return "The scene deepens, every detail bending around the choice just made."
        credentials = list(model_config.provider_connection.credentials.filter(is_enabled=True))
        if not credentials:
            raise HttpError(400, "No enabled provider credentials are available")
        if model_config.owner_type == OwnerScope.USER and model_config.owner_user_id != user.id:
            raise HttpError(403, "Model config is not available")
        if model_config.owner_type == OwnerScope.USER and any(c.owner_user_id != user.id for c in credentials):
            raise HttpError(403, "User model credentials must not cross user scope")
        if model_config.owner_type == OwnerScope.PLATFORM and any(c.owner_type != OwnerScope.PLATFORM for c in credentials):
            raise HttpError(403, "Global models must use platform credentials only")
        try:
            from rotator_library import RotatingClient
        except Exception as exc:
            raise HttpError(500, "rotator_library is unavailable") from exc
        provider = model_config.provider_connection.provider_type
        classifier = self.classifier_for(model_config)
        api_keys = {provider: [credential.get_secret() for credential in credentials if credential.get_secret()]}
        if not api_keys.get(provider):
            raise HttpError(400, "No usable provider credentials are available")
        client = RotatingClient(api_keys={}, data_dir=settings.IMAGINAI_ROTATOR_DATA_DIR, configure_logging=False)
        params = generation_params or {}
        response = await client.acompletion(
            model=self.model_alias(model_config),
            messages=messages,
            stream=stream,
            classifier=classifier,
            api_keys=api_keys,
            private=True,
            temperature=params.get("temperature", model_config.temperature),
            top_p=params.get("topP", model_config.top_p),
            max_tokens=params.get("providerSafetyMaxTokens") or model_config.provider_safety_max_tokens,
            **(model_config.extra_parameters or {}),
        )
        if stream:
            return response
        if isinstance(response, dict) and response.get("error"):
            raise HttpError(502, response.get("error", "Provider error"))
        if hasattr(response, "choices") and response.choices:
            return response.choices[0].message.content or ""
        if hasattr(response, "model_dump"):
            dumped = response.model_dump()
            return dumped.get("choices", [{}])[0].get("message", {}).get("content", "")
        return str(response)

    @staticmethod
    def classifier_for(model_config: ModelConfig) -> str:
        """Build deterministic classifier strings for rotator credential isolation."""
        if model_config.owner_type == OwnerScope.PLATFORM:
            return f"platform:connection:{model_config.provider_connection_id}"
        return f"user:{model_config.owner_user_id}:connection:{model_config.provider_connection_id}"

    @staticmethod
    def model_alias(model_config: ModelConfig) -> str:
        """Build the provider/model string expected by current rotator_library APIs."""
        provider = model_config.provider_connection.provider_type
        if "/" in model_config.model_id and model_config.model_id.startswith(provider):
            return model_config.model_id
        return f"{provider}/{model_config.model_id}"


class GenerationService:
    """Coordinates state, prompts, gateway calls, variants, prompt snapshots, and usage rows."""

    def __init__(self, gateway: RotatorGateway | None = None):
        """Create the generation service with an injectable gateway for tests."""
        self.gateway = gateway or RotatorGateway()

    async def generate(self, user, adventure: Adventure, intent: str, action_type: str = "", content: str = "", model_config_id: str | None = None, generation_settings: dict | None = None, retry_instruction: str = "", response_group_id: str | None = None, include_variant_ids: list[str] | None = None) -> dict:
        """Run one non-streaming generation and commit the resulting turn or retry variant."""
        if adventure.owner_user_id != user.id:
            raise HttpError(404, "Adventure not found")
        generation_settings = generation_settings or {}
        model_config = ModelConfigService.resolve_for_user(user, model_config_id or adventure.current_model_config_id)
        state = AdventureStateService.reconstruct(adventure)
        messages, debug = PromptBuilder.build(
            adventure,
            state,
            model_config,
            intent,
            action_type=action_type,
            content=content,
            retry_instruction=retry_instruction,
            include_variant_ids=include_variant_ids or [],
            context_limit=generation_settings.get("contextLimit"),
        )
        prompt_snapshot = PromptSnapshot.objects.create(
            adventure=adventure,
            model_config=model_config,
            generation_intent=intent,
            state_sequence=state.state_sequence,
            context_limit=debug["estimatedTokensByLayer"].get("effectiveLimit", 0),
            estimated_tokens_by_layer=debug["estimatedTokensByLayer"],
            included_modules=debug["includedModules"],
            activated_cards=debug["activatedCards"],
            included_summary_ids=debug["includedSummaryIds"],
            included_memory_ids=debug["includedMemoryIds"],
            included_turn_range=debug["includedTurnRange"],
            messages=messages,
        )
        raw_text = await self.gateway.complete(user, model_config, messages, stream=False, generation_params=generation_settings)
        final_text = ResponsePostProcessor.trim(str(raw_text), generation_settings.get("visibleTargetTokens") or model_config.visible_response_target_tokens)
        usage = self._save_usage(user, adventure, model_config, prompt_snapshot, final_text)
        with transaction.atomic():
            user_turn = None
            if intent == "player_action":
                user_turn = AdventureTurn.objects.create(
                    adventure=adventure,
                    sequence=next_turn_sequence(adventure),
                    timeline_sequence=next_timeline(adventure),
                    state_sequence=state.state_sequence,
                    role=AdventureTurn.Role.USER,
                    action_type=action_type,
                    content=content,
                )
            if intent == "retry":
                group = ResponseGroup.objects.get(id=response_group_id, adventure=adventure) if response_group_id else ResponseGroup.objects.create(adventure=adventure)
                GenerationVariant.objects.filter(response_group=group, is_active=True).update(is_active=False, archived_at=timezone.now())
                variant = GenerationVariant.objects.create(
                    response_group=group,
                    adventure=adventure,
                    content=final_text,
                    retry_instruction=retry_instruction,
                    included_variant_ids=include_variant_ids or [],
                    model_config=model_config,
                    prompt_snapshot=prompt_snapshot,
                    token_usage=usage,
                    is_active=True,
                )
                group.active_variant = variant
                group.save(update_fields=["active_variant"])
                return {"variant": variant, "turn": None, "promptSnapshot": prompt_snapshot, "tokenUsage": usage}
            group = ResponseGroup.objects.create(adventure=adventure)
            turn = AdventureTurn.objects.create(
                adventure=adventure,
                sequence=next_turn_sequence(adventure),
                timeline_sequence=next_timeline(adventure),
                state_sequence=state.state_sequence,
                role=AdventureTurn.Role.ASSISTANT,
                action_type=AdventureTurn.ActionType.CONTINUE if intent == "continue" else "",
                content=final_text,
                response_group=group,
                model_config=model_config,
                prompt_snapshot=prompt_snapshot,
                token_usage=usage,
            )
            variant = GenerationVariant.objects.create(response_group=group, adventure=adventure, content=final_text, model_config=model_config, prompt_snapshot=prompt_snapshot, token_usage=usage, is_active=True)
            group.active_variant = variant
            group.save(update_fields=["active_variant"])
        return {"turn": turn, "userTurn": user_turn, "variant": variant, "promptSnapshot": prompt_snapshot, "tokenUsage": usage}

    async def generate_stream(self, *args, **kwargs) -> AsyncGenerator[str, None]:
        """Yield frontend SSE events around generation while committing final content at the end."""
        yield sse({"type": "generation.status", "phase": "building_context", "message": "Building story context"})
        try:
            yield sse({"type": "generation.status", "phase": "calling_model", "message": "Calling model"})
            result = await self.generate(*args, **kwargs)
            content = result["variant"].content if result.get("variant") else result["turn"].content
            yield sse({"type": "generation.content_delta", "text": content})
            yield sse({"type": "generation.final", "turnId": str(result["turn"].id) if result.get("turn") else None, "variantId": str(result["variant"].id) if result.get("variant") else None, "content": content, "tokenUsageId": str(result["tokenUsage"].id)})
        except Exception as exc:
            yield sse({"type": "generation.error", "message": str(exc)})

    def _save_usage(self, user, adventure: Adventure, model_config: ModelConfig, prompt_snapshot: PromptSnapshot, final_text: str) -> TokenUsage:
        """Persist app-level token usage estimates without raw provider secrets."""
        prompt_tokens = sum(v for k, v in prompt_snapshot.estimated_tokens_by_layer.items() if isinstance(v, int) and k not in {"effectiveLimit", "reservedForResponseAndSafety"})
        completion_tokens = estimate_tokens(final_text)
        return TokenUsage.objects.create(
            user=user,
            adventure=adventure,
            model_config=model_config,
            provider_connection=model_config.provider_connection,
            prompt_snapshot=prompt_snapshot,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            visible_output_tokens=completion_tokens,
            total_tokens=prompt_tokens + completion_tokens,
            estimated_cost=Decimal("0.0"),
            provider=model_config.provider_connection.provider_type,
            model_id=model_config.model_id,
            raw_metadata={"estimated": True},
        )


def run_async(coro):
    """Run an async service call from synchronous Django Ninja routes."""
    return asyncio.run(coro)
