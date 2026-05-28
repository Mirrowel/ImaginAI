from __future__ import annotations

import asyncio
import json
import queue
import re
import threading
from dataclasses import dataclass
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.utils.text import slugify
from django.utils import timezone
from ninja.errors import HttpError

from adventures.models import Adventure, AdventureTurn, GenerationVariant, PromptSnapshot, ResponseGroup, TokenUsage
from adventures.services import AdventureStateService, TurnService, next_timeline, next_turn_sequence
from ai_providers.models import ModelConfig, OwnerScope
from ai_providers.services import ModelConfigService
from story_engine.hooks import StoryEngineHooks


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


@dataclass
class GatewayCompletion:
    """Provider response text plus optional usage metadata normalized at the product boundary."""

    text: str
    usage: dict
    raw_metadata: dict


class CardActivationService:
    """Selects active cards by mode, triggers, and priority instead of injecting all cards."""

    @staticmethod
    def activate(cards: list[dict], current_text: str, recent_turns: list[AdventureTurn], retry_instruction: str = "", token_budget: int | None = None) -> list[dict]:
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
        sorted_cards = sorted(active, key=lambda item: (item.get("priority", 100), item.get("sortOrder", 0), item.get("title", "")))
        if not token_budget:
            return sorted_cards
        selected: list[dict] = []
        used = 0
        for card in sorted_cards:
            card_text = f"{card.get('title')} {card.get('summary')} {card.get('content')}"
            cost = min(estimate_tokens(card_text), int(card.get("tokenBudget") or token_budget))
            if used + cost <= token_budget:
                selected.append(card)
                used += cost
        return selected

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
        activated_cards = CardActivationService.activate(state.cards, content, active_turns, retry_instruction, token_budget=max(512, model_config.context_window // 5))
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
        if rough.count("```") % 2 == 1:
            rough = rough.rsplit("```", 1)[0].rstrip()
        boundary = max(rough.rfind("\n\n"), rough.rfind(". "), rough.rfind("! "), rough.rfind("? "), rough.rfind('" '), rough.rfind("; "))
        if boundary > max(80, len(rough) // 2):
            return rough[: boundary + 1].strip()
        return rough.rstrip(",;:- ") + "..."


class RotatorGateway:
    """Only boundary allowed to call rotator_library; it enforces model/credential scope first."""

    ERROR_STATUS = {
        "model_config_unavailable": 404,
        "no_credentials": 400,
        "provider_auth_failed": 401,
        "provider_rate_limited": 429,
        "quota_exhausted": 429,
        "context_too_large": 413,
        "provider_timeout": 504,
        "provider_unavailable": 503,
        "stream_interrupted": 502,
        "unknown_provider_error": 502,
    }

    async def complete(self, user, model_config: ModelConfig, messages: list[dict], stream: bool = False, generation_params: dict | None = None):
        """Call rotator_library with scoped private credentials or return fake text in dev mode."""
        if settings.IMAGINAI_FAKE_LLM:
            return GatewayCompletion("The scene deepens, every detail bending around the choice just made.", {}, {"fake": True})
        credentials = list(model_config.provider_connection.credentials.filter(is_enabled=True))
        if not credentials:
            self.raise_gateway_error("no_credentials", "No enabled provider credentials are available")
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
            self.raise_gateway_error("no_credentials", "No usable provider credentials are available")
        client = RotatingClient(api_keys={}, data_dir=settings.IMAGINAI_ROTATOR_DATA_DIR, configure_logging=False)
        params = generation_params or {}
        try:
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
                thinking_enabled=params.get("thinkingEnabled", model_config.thinking_enabled),
                thinking_budget=params.get("thinkingBudget") or model_config.thinking_budget,
                **(model_config.extra_parameters or {}),
            )
        except Exception as exc:
            error_type = self.normalized_error_type(str(exc))
            self.raise_gateway_error(error_type, str(exc))
        if stream:
            return response
        if isinstance(response, dict) and response.get("error"):
            message = str(response.get("error", "Provider error"))
            self.raise_gateway_error(self.normalized_error_type(message), message)
        usage = self.extract_usage(response)
        raw_metadata = {"providerResponseType": type(response).__name__, "usageSource": "provider" if usage else "estimated"}
        if hasattr(response, "choices") and response.choices:
            return GatewayCompletion(response.choices[0].message.content or "", usage, raw_metadata)
        if hasattr(response, "model_dump"):
            dumped = response.model_dump()
            return GatewayCompletion(dumped.get("choices", [{}])[0].get("message", {}).get("content", ""), usage or self.extract_usage(dumped), raw_metadata)
        if isinstance(response, dict):
            return GatewayCompletion(str(response.get("content") or response.get("text") or response), usage, raw_metadata)
        return GatewayCompletion(str(response), usage, raw_metadata)

    @classmethod
    def normalized_error_type(cls, message: str) -> str:
        """Map provider/rotator failure text into the product error taxonomy."""
        text = message.lower()
        if any(part in text for part in ["credential", "api key", "no key"]):
            return "no_credentials"
        if any(part in text for part in ["unauthorized", "invalid auth", "authentication", "401"]):
            return "provider_auth_failed"
        if any(part in text for part in ["rate limit", "too many requests", "429"]):
            return "provider_rate_limited"
        if any(part in text for part in ["quota", "insufficient credits", "billing"]):
            return "quota_exhausted"
        if any(part in text for part in ["context", "token limit", "maximum context"]):
            return "context_too_large"
        if any(part in text for part in ["timeout", "timed out"]):
            return "provider_timeout"
        if any(part in text for part in ["unavailable", "overloaded", "503", "502"]):
            return "provider_unavailable"
        if any(part in text for part in ["stream", "chunk", "interrupted"]):
            return "stream_interrupted"
        return "unknown_provider_error"

    @classmethod
    def raise_gateway_error(cls, error_type: str, message: str):
        """Raise a sanitized API error with a stable machine-readable type."""
        safe_message = re.sub(r"sk-[A-Za-z0-9_\-]+", "[redacted]", message)
        raise HttpError(cls.ERROR_STATUS.get(error_type, 502), f"{error_type}: {safe_message}")

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
        if provider == "custom":
            slug = slugify(model_config.provider_connection.name) or str(model_config.provider_connection_id)[:8]
            provider = f"custom_{slug}"
        if "/" in model_config.model_id and model_config.model_id.startswith(provider):
            return model_config.model_id
        return f"{provider}/{model_config.model_id}"

    @staticmethod
    def extract_usage(response) -> dict:
        """Extract provider token usage from dicts or LiteLLM/OpenAI-like response objects."""
        usage = None
        if isinstance(response, dict):
            usage = response.get("usage")
        elif hasattr(response, "usage"):
            usage = response.usage
        elif hasattr(response, "model_dump"):
            usage = response.model_dump().get("usage")
        if hasattr(usage, "model_dump"):
            usage = usage.model_dump()
        if not isinstance(usage, dict):
            return {}
        completion_details = usage.get("completion_tokens_details") or {}
        prompt_details = usage.get("prompt_tokens_details") or {}
        return {
            "promptTokens": usage.get("prompt_tokens") or usage.get("promptTokens") or 0,
            "completionTokens": usage.get("completion_tokens") or usage.get("completionTokens") or 0,
            "reasoningTokens": completion_details.get("reasoning_tokens") or usage.get("reasoning_tokens") or 0,
            "cachedTokens": prompt_details.get("cached_tokens") or usage.get("cache_read_tokens") or 0,
            "totalTokens": usage.get("total_tokens") or usage.get("totalTokens") or 0,
        }

    @staticmethod
    def normalize_stream_chunk(chunk) -> dict:
        """Normalize common provider/rotator stream chunks into generation SSE event payloads."""
        if isinstance(chunk, str):
            text = chunk.strip()
            if text.startswith("data:"):
                text = text[5:].strip()
            if text == "[DONE]":
                return {"type": "generation.status", "phase": "stream", "message": "Provider stream complete"}
            try:
                return RotatorGateway.normalize_stream_chunk(json.loads(text))
            except Exception:
                return {"type": "generation.content_delta", "text": chunk}
        if isinstance(chunk, dict):
            if chunk.get("type") in {"generation.content_delta", "generation.thinking_delta", "generation.token_update"}:
                return chunk
            choices = chunk.get("choices") or []
            if choices:
                choice = choices[0]
                delta = choice.get("delta") or {}
                if delta.get("reasoning_content") or delta.get("thinking"):
                    return {"type": "generation.thinking_delta", "text": str(delta.get("reasoning_content") or delta.get("thinking"))}
                if delta.get("content"):
                    return {"type": "generation.content_delta", "text": str(delta.get("content"))}
            delta = chunk.get("delta") or chunk.get("content") or chunk.get("text")
            if delta:
                return {"type": "generation.content_delta", "text": str(delta)}
            usage = chunk.get("usage")
            if usage:
                return {"type": "generation.token_update", **usage}
        if hasattr(chunk, "choices") and chunk.choices:
            choice = chunk.choices[0]
            delta = getattr(getattr(choice, "delta", None), "content", None)
            if delta:
                return {"type": "generation.content_delta", "text": delta}
        return {"type": "generation.status", "phase": "stream", "message": "Received provider stream chunk"}


class GenerationService:
    """Coordinates state, prompts, gateway calls, variants, prompt snapshots, and usage rows."""

    def __init__(self, gateway: RotatorGateway | None = None, hooks: StoryEngineHooks | None = None):
        """Create the generation service with an injectable gateway for tests."""
        self.gateway = gateway or RotatorGateway()
        self.hooks = hooks or StoryEngineHooks()

    def _hook(self, method_name: str, context: dict, *args) -> None:
        """Run a no-op/future hook from the synchronous orchestration path."""
        method = getattr(self.hooks, method_name)
        run_async(method(context, *args))

    def generate(self, user, adventure: Adventure, intent: str, action_type: str = "", content: str = "", model_config_id: str | None = None, generation_settings: dict | None = None, retry_instruction: str = "", response_group_id: str | None = None, include_variant_ids: list[str] | None = None) -> dict:
        """Run one non-streaming generation and commit the resulting turn or retry variant."""
        if adventure.owner_user_id != user.id:
            raise HttpError(404, "Adventure not found")
        generation_settings = generation_settings or {}
        if intent in {"player_action", "continue"}:
            self.commit_active_variants(adventure)
        model_config = ModelConfigService.resolve_for_user(user, model_config_id or adventure.current_model_config_id)
        if intent == "retry" and not response_group_id:
            raise HttpError(400, "Retry requires an existing responseGroupId")
        hook_context = {"user": user, "adventure": adventure, "intent": intent, "modelConfig": model_config, "generationSettings": generation_settings}
        self._hook("before_state_load", hook_context)
        state = AdventureStateService.reconstruct(adventure)
        generation_settings = {**state.generation_settings, **generation_settings}
        hook_context["generationSettings"] = generation_settings
        hook_context["state"] = state
        self._hook("after_state_load", hook_context)
        self._hook("before_context_selection", hook_context)
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
        hook_context.update({"messages": messages, "debug": debug})
        self._hook("after_context_selection", hook_context)
        self._hook("before_prompt_build", hook_context)
        self._hook("after_prompt_build", hook_context)
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
        hook_context["promptSnapshot"] = prompt_snapshot
        self._hook("before_model_call", hook_context)
        completion = run_async(self.gateway.complete(user, model_config, messages, stream=False, generation_params=generation_settings))
        if isinstance(completion, GatewayCompletion):
            raw_text = completion.text
            provider_usage = completion.usage
            raw_usage_metadata = completion.raw_metadata
        else:
            raw_text = str(completion)
            provider_usage = {}
            raw_usage_metadata = {"estimated": True, "coercedResponseType": type(completion).__name__}
        hook_context["rawText"] = raw_text
        self._hook("after_model_response", hook_context)
        final_text = ResponsePostProcessor.trim(str(raw_text), generation_settings.get("visibleTargetTokens") or model_config.visible_response_target_tokens)
        usage = self._save_usage(user, adventure, model_config, prompt_snapshot, final_text, provider_usage, raw_usage_metadata)
        hook_context.update({"finalText": final_text, "tokenUsage": usage})
        self._hook("before_turn_commit", hook_context)
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
                group = ResponseGroup.objects.get(id=response_group_id, adventure=adventure)
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
                hook_context.update({"variant": variant, "turn": None})
                self._hook("after_turn_commit", hook_context)
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
        hook_context.update({"variant": variant, "turn": turn, "userTurn": user_turn})
        self._hook("after_turn_commit", hook_context)
        return {"turn": turn, "userTurn": user_turn, "variant": variant, "promptSnapshot": prompt_snapshot, "tokenUsage": usage}

    def generate_stream(self, *args, **kwargs):
        """Yield provider-backed SSE events and commit final content after the stream completes."""
        yield sse({"type": "generation.status", "phase": "queued", "message": "Queued generation"})
        yield sse({"type": "generation.status", "phase": "building_context", "message": "Building story context"})
        try:
            if settings.IMAGINAI_FAKE_LLM:
                yield from self._generate_stream_fallback(*args, **kwargs)
                return
            yield from self._generate_stream_real(*args, **kwargs)
        except Exception as exc:
            yield sse({"type": "generation.error", "message": str(exc)})

    def _generate_stream_fallback(self, *args, **kwargs):
        """Use non-streaming generation when fake/local mode is active."""
        try:
            yield sse({"type": "generation.status", "phase": "calling_model", "message": "Calling model"})
            result = self.generate(*args, **kwargs)
            content = result["variant"].content if result.get("variant") else result["turn"].content
            yield sse({"type": "generation.status", "phase": "post_processing", "message": "Post-processing response"})
            yield sse({"type": "generation.content_delta", "text": content})
            yield sse({"type": "generation.token_update", "tokenUsageId": str(result["tokenUsage"].id), "totalTokens": result["tokenUsage"].total_tokens})
            if result.get("variant"):
                yield sse({"type": "generation.variant_created", "variantId": str(result["variant"].id), "responseGroupId": str(result["variant"].response_group_id)})
            yield sse({"type": "generation.status", "phase": "saved", "message": "Generation saved"})
            yield sse({"type": "generation.final", "turnId": str(result["turn"].id) if result.get("turn") else None, "variantId": str(result["variant"].id) if result.get("variant") else None, "content": content, "tokenUsageId": str(result["tokenUsage"].id)})
        except Exception as exc:
            yield sse({"type": "generation.error", "message": str(exc)})

    def _generate_stream_real(self, user, adventure: Adventure, intent: str, action_type: str = "", content: str = "", model_config_id: str | None = None, generation_settings: dict | None = None, retry_instruction: str = "", response_group_id: str | None = None, include_variant_ids: list[str] | None = None):
        """Prepare prompt synchronously, stream model chunks, then commit the final canonical records."""
        if adventure.owner_user_id != user.id:
            raise HttpError(404, "Adventure not found")
        generation_settings = generation_settings or {}
        if intent in {"player_action", "continue"}:
            self.commit_active_variants(adventure)
        model_config = ModelConfigService.resolve_for_user(user, model_config_id or adventure.current_model_config_id)
        if intent == "retry" and not response_group_id:
            raise HttpError(400, "Retry requires an existing responseGroupId")
        hook_context = {"user": user, "adventure": adventure, "intent": intent, "modelConfig": model_config, "generationSettings": generation_settings}
        self._hook("before_state_load", hook_context)
        state = AdventureStateService.reconstruct(adventure)
        generation_settings = {**state.generation_settings, **generation_settings}
        hook_context.update({"state": state, "generationSettings": generation_settings})
        self._hook("after_state_load", hook_context)
        self._hook("before_context_selection", hook_context)
        messages, debug = PromptBuilder.build(adventure, state, model_config, intent, action_type=action_type, content=content, retry_instruction=retry_instruction, include_variant_ids=include_variant_ids or [], context_limit=generation_settings.get("contextLimit"))
        hook_context.update({"messages": messages, "debug": debug})
        self._hook("after_context_selection", hook_context)
        self._hook("before_prompt_build", hook_context)
        self._hook("after_prompt_build", hook_context)
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
        hook_context["promptSnapshot"] = prompt_snapshot
        self._hook("before_model_call", hook_context)
        yield sse({"type": "generation.status", "phase": "calling_model", "message": "Calling model"})
        if model_config.thinking_enabled or generation_settings.get("thinkingEnabled"):
            yield sse({"type": "generation.status", "phase": "thinking", "message": "Model thinking"})
        final_parts: list[str] = []
        provider_usage: dict = {}
        yield sse({"type": "generation.status", "phase": "writing", "message": "Writing response"})
        for chunk in self._sync_iter_gateway_stream(self.gateway.complete(user, model_config, messages, stream=True, generation_params=generation_settings)):
            event = self.gateway.normalize_stream_chunk(chunk)
            if event.get("type") == "generation.content_delta":
                final_parts.append(event.get("text", ""))
            elif event.get("type") == "generation.token_update":
                provider_usage.update(RotatorGateway.extract_usage({"usage": event}) or event)
            self._hook("on_stream_chunk", hook_context, event)
            yield sse(event)
        raw_text = "".join(final_parts)
        hook_context["rawText"] = raw_text
        self._hook("after_model_response", hook_context)
        yield sse({"type": "generation.status", "phase": "post_processing", "message": "Post-processing response"})
        final_text = ResponsePostProcessor.trim(raw_text, generation_settings.get("visibleTargetTokens") or model_config.visible_response_target_tokens)
        usage = self._save_usage(user, adventure, model_config, prompt_snapshot, final_text, provider_usage, {"usageSource": "provider_stream" if provider_usage else "estimated_stream"})
        result = self._commit_generation_result(user, adventure, intent, action_type, content, retry_instruction, response_group_id, include_variant_ids or [], model_config, prompt_snapshot, usage, final_text, state, hook_context)
        yield sse({"type": "generation.token_update", "tokenUsageId": str(usage.id), "totalTokens": usage.total_tokens})
        if result.get("variant"):
            yield sse({"type": "generation.variant_created", "variantId": str(result["variant"].id), "responseGroupId": str(result["variant"].response_group_id)})
        yield sse({"type": "generation.status", "phase": "saved", "message": "Generation saved"})
        yield sse({"type": "generation.final", "turnId": str(result["turn"].id) if result.get("turn") else None, "variantId": str(result["variant"].id) if result.get("variant") else None, "content": final_text, "tokenUsageId": str(usage.id)})

    def _commit_generation_result(self, user, adventure: Adventure, intent: str, action_type: str, content: str, retry_instruction: str, response_group_id: str | None, include_variant_ids: list[str], model_config: ModelConfig, prompt_snapshot: PromptSnapshot, usage: TokenUsage, final_text: str, state, hook_context: dict) -> dict:
        """Commit a streamed or non-streamed generation result into canonical turn/variant records."""
        self._hook("before_turn_commit", hook_context)
        with transaction.atomic():
            user_turn = None
            if intent == "player_action":
                user_turn = AdventureTurn.objects.create(adventure=adventure, sequence=next_turn_sequence(adventure), timeline_sequence=next_timeline(adventure), state_sequence=state.state_sequence, role=AdventureTurn.Role.USER, action_type=action_type, content=content)
            if intent == "retry":
                group = ResponseGroup.objects.get(id=response_group_id, adventure=adventure)
                GenerationVariant.objects.filter(response_group=group, is_active=True).update(is_active=False, archived_at=timezone.now())
                variant = GenerationVariant.objects.create(response_group=group, adventure=adventure, content=final_text, retry_instruction=retry_instruction, included_variant_ids=include_variant_ids, model_config=model_config, prompt_snapshot=prompt_snapshot, token_usage=usage, is_active=True)
                group.active_variant = variant
                group.save(update_fields=["active_variant"])
                hook_context.update({"variant": variant, "turn": None})
                self._hook("after_turn_commit", hook_context)
                return {"variant": variant, "turn": None, "promptSnapshot": prompt_snapshot, "tokenUsage": usage}
            group = ResponseGroup.objects.create(adventure=adventure)
            turn = AdventureTurn.objects.create(adventure=adventure, sequence=next_turn_sequence(adventure), timeline_sequence=next_timeline(adventure), state_sequence=state.state_sequence, role=AdventureTurn.Role.ASSISTANT, action_type=AdventureTurn.ActionType.CONTINUE if intent == "continue" else "", content=final_text, response_group=group, model_config=model_config, prompt_snapshot=prompt_snapshot, token_usage=usage)
            variant = GenerationVariant.objects.create(response_group=group, adventure=adventure, content=final_text, model_config=model_config, prompt_snapshot=prompt_snapshot, token_usage=usage, is_active=True)
            group.active_variant = variant
            group.save(update_fields=["active_variant"])
        hook_context.update({"variant": variant, "turn": turn, "userTurn": user_turn, "finalText": final_text, "tokenUsage": usage})
        self._hook("after_turn_commit", hook_context)
        return {"turn": turn, "userTurn": user_turn, "variant": variant, "promptSnapshot": prompt_snapshot, "tokenUsage": usage}

    @staticmethod
    def commit_active_variants(adventure: Adventure) -> None:
        """Make each response group's selected variant canonical before continuing the timeline."""
        for group in ResponseGroup.objects.filter(adventure=adventure, active_variant__isnull=False).select_related("active_variant"):
            active = group.active_variant
            turn = adventure.turns.filter(response_group=group).first()
            if not turn:
                continue
            updates = []
            if turn.content != active.content:
                turn.content = active.content
                updates.append("content")
            for attr in ["model_config", "prompt_snapshot", "token_usage"]:
                if getattr(turn, f"{attr}_id") != getattr(active, f"{attr}_id"):
                    setattr(turn, attr, getattr(active, attr))
                    updates.append(attr)
            if updates:
                turn.save(update_fields=updates + ["updated_at"])
            GenerationVariant.objects.filter(response_group=group).exclude(id=active.id).filter(archived_at__isnull=True).update(is_active=False, archived_at=timezone.now())

    @staticmethod
    def _sync_iter_gateway_stream(stream_coro):
        """Run gateway stream creation and consumption in one event loop thread."""
        output: queue.Queue = queue.Queue()
        done = object()

        async def consume():
            """Create and consume the provider stream without crossing event-loop ownership."""
            stream = await stream_coro
            if hasattr(stream, "__aiter__"):
                async for chunk in stream:
                    output.put(chunk)
            else:
                output.put(stream)
            output.put(done)

        def run_consumer():
            """Run the async provider stream in a private loop for sync Django streaming."""
            try:
                asyncio.run(consume())
            except Exception as exc:
                output.put(exc)

        threading.Thread(target=run_consumer, daemon=True).start()
        while True:
            item = output.get()
            if item is done:
                break
            if isinstance(item, Exception):
                raise item
            yield item

    @staticmethod
    def _sync_iter_stream(stream):
        """Bridge an async provider stream into Django's synchronous StreamingHttpResponse path."""
        if hasattr(stream, "__aiter__"):
            output: queue.Queue = queue.Queue()
            done = object()

            async def consume():
                """Consume the provider async iterator and pass chunks across a thread-safe queue."""
                async for chunk in stream:
                    output.put(chunk)
                output.put(done)

            def run_consumer():
                """Run the async provider consumer in a private event loop."""
                try:
                    asyncio.run(consume())
                except Exception as exc:
                    output.put(exc)

            threading.Thread(target=run_consumer, daemon=True).start()
            while True:
                item = output.get()
                if item is done:
                    break
                if isinstance(item, Exception):
                    raise item
                yield item
            return
        if isinstance(stream, GatewayCompletion):
            yield stream.text
            return
        if isinstance(stream, str):
            yield stream
            return
        yield from stream

    def _save_usage(self, user, adventure: Adventure, model_config: ModelConfig, prompt_snapshot: PromptSnapshot, final_text: str, provider_usage: dict | None = None, raw_metadata: dict | None = None) -> TokenUsage:
        """Persist provider usage when present, otherwise keep explicit local estimates."""
        provider_usage = provider_usage or {}
        estimated_prompt_tokens = sum(v for k, v in prompt_snapshot.estimated_tokens_by_layer.items() if isinstance(v, int) and k not in {"effectiveLimit", "reservedForResponseAndSafety"})
        estimated_completion_tokens = estimate_tokens(final_text)
        prompt_tokens = int(provider_usage.get("promptTokens") or estimated_prompt_tokens)
        completion_tokens = int(provider_usage.get("completionTokens") or estimated_completion_tokens)
        reasoning_tokens = int(provider_usage.get("reasoningTokens") or 0)
        cached_tokens = int(provider_usage.get("cachedTokens") or 0)
        total_tokens = int(provider_usage.get("totalTokens") or (prompt_tokens + completion_tokens + reasoning_tokens))
        return TokenUsage.objects.create(
            user=user,
            adventure=adventure,
            model_config=model_config,
            provider_connection=model_config.provider_connection,
            prompt_snapshot=prompt_snapshot,
            prompt_tokens=prompt_tokens,
            completion_tokens=completion_tokens,
            visible_output_tokens=estimated_completion_tokens,
            reasoning_tokens=reasoning_tokens,
            cached_tokens=cached_tokens,
            total_tokens=total_tokens,
            estimated_cost=Decimal("0.0"),
            provider=model_config.provider_connection.provider_type,
            model_id=model_config.model_id,
            raw_metadata=raw_metadata or {"estimated": not bool(provider_usage)},
        )


def run_async(coro):
    """Run an async service call from synchronous Django Ninja routes."""
    return asyncio.run(coro)
