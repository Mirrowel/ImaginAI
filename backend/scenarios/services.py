from __future__ import annotations

import hashlib
import json

from django.db import transaction
from ninja.errors import HttpError

from ai_providers.services import ModelConfigService
from scenarios.models import Scenario, ScenarioModule, ScenarioVersion, StoryCard


DEFAULT_MODULES = [
    ("instructions", "Instructions", 10),
    ("plot_essentials", "Plot Essentials", 20),
    ("authors_notes", "Author's Notes", 30),
    ("opening_scene", "Opening Scene", 40),
    ("player_description", "Player Description", 50),
]


def normalize_tags(value) -> list[str]:
    """Normalize UI/import tag input into a clean list of display strings."""
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    if isinstance(value, list):
        return [str(part).strip() for part in value if str(part).strip()]
    return []


def normalize_triggers(value) -> list[str]:
    """Normalize AID/UI trigger keys while preserving display-friendly phrases."""
    if isinstance(value, str):
        return [part.strip() for part in value.split(",") if part.strip()]
    if isinstance(value, list):
        return [str(part).strip() for part in value if str(part).strip()]
    return []


def module_to_dict(module: ScenarioModule) -> dict:
    """Serialize a scenario module into the frontend/API DTO shape."""
    return {
        "id": str(module.id),
        "moduleType": module.module_type,
        "title": module.title,
        "content": module.content,
        "settings": module.settings,
        "sortOrder": module.sort_order,
        "isEnabled": module.is_enabled,
    }


def card_to_dict(card: StoryCard) -> dict:
    """Serialize a story card into the frontend/API DTO shape."""
    return {
        "id": str(card.id),
        "title": card.title,
        "cardType": card.card_type,
        "summary": card.summary,
        "content": card.content,
        "triggerWords": card.trigger_words,
        "useForCharacterCreation": card.use_for_character_creation,
        "activationMode": card.activation_mode,
        "priority": card.priority,
        "tokenBudget": card.token_budget,
        "metadata": card.metadata,
        "isEnabled": card.is_enabled,
        "sortOrder": card.sort_order,
    }


class ScenarioService:
    """Scenario drafts remain mutable; adventures start from immutable versions frozen from these records."""

    @staticmethod
    def queryset_for_user(user):
        """Return scenarios owned by the current user."""
        return Scenario.objects.filter(owner_user=user)

    @staticmethod
    def create(user, payload: dict) -> Scenario:
        """Create a scenario draft with default extensible modules and optional cards."""
        default_model = None
        if payload.get("defaultModelConfigId"):
            default_model = ModelConfigService.resolve_for_user(user, payload["defaultModelConfigId"])
        scenario = Scenario.objects.create(
            owner_user=user,
            title=payload.get("title") or payload.get("name") or "Untitled Scenario",
            description=payload.get("description") or "",
            visibility=payload.get("visibility") or Scenario.Visibility.PRIVATE,
            tags=normalize_tags(payload.get("tags", [])),
            default_model_config=default_model,
            import_metadata=payload.get("importMetadata") or {},
        )
        modules = payload.get("modules") or []
        if modules:
            for i, data in enumerate(modules):
                ScenarioModule.objects.create(
                    scenario=scenario,
                    module_type=data.get("moduleType") or data.get("module_type") or "custom",
                    title=data.get("title") or data.get("moduleType") or "Module",
                    content=data.get("content") or "",
                    settings=data.get("settings") or {},
                    sort_order=data.get("sortOrder", i * 10),
                    is_enabled=data.get("isEnabled", True),
                )
        else:
            for module_type, title, order in DEFAULT_MODULES:
                ScenarioModule.objects.create(scenario=scenario, module_type=module_type, title=title, sort_order=order)
        for i, data in enumerate(payload.get("cards") or []):
            StoryCardService.create_draft_card(scenario, data, i)
        ScenarioVersionService.update_draft_hash(scenario)
        return scenario

    @staticmethod
    def update(user, scenario: Scenario, payload: dict) -> Scenario:
        """Patch scenario metadata and refresh the draft hash used for freeze checks."""
        if scenario.owner_user_id != user.id:
            raise HttpError(404, "Scenario not found")
        if "title" in payload or "name" in payload:
            scenario.title = payload.get("title") or payload.get("name") or scenario.title
        if "description" in payload:
            scenario.description = payload["description"] or ""
        if "visibility" in payload:
            scenario.visibility = payload["visibility"]
        if "tags" in payload:
            scenario.tags = normalize_tags(payload["tags"])
        if "defaultModelConfigId" in payload:
            scenario.default_model_config = ModelConfigService.resolve_for_user(user, payload["defaultModelConfigId"]) if payload["defaultModelConfigId"] else None
        scenario.save()
        ScenarioVersionService.update_draft_hash(scenario)
        return scenario

    @staticmethod
    def duplicate(user, scenario: Scenario, title: str | None = None) -> Scenario:
        """Deep-copy a scenario draft without copying any adventures."""
        if scenario.owner_user_id != user.id:
            raise HttpError(404, "Scenario not found")
        with transaction.atomic():
            clone = Scenario.objects.create(
                owner_user=user,
                title=title or f"{scenario.title} (Copy)",
                description=scenario.description,
                visibility=Scenario.Visibility.PRIVATE,
                tags=list(scenario.tags),
                default_model_config=scenario.default_model_config,
                import_metadata=scenario.import_metadata,
            )
            for module in scenario.draft_modules.all():
                ScenarioModule.objects.create(
                    scenario=clone,
                    module_type=module.module_type,
                    title=module.title,
                    content=module.content,
                    settings=module.settings,
                    sort_order=module.sort_order,
                    is_enabled=module.is_enabled,
                )
            for card in scenario.draft_cards.all():
                StoryCard.objects.create(
                    scenario=clone,
                    title=card.title,
                    card_type=card.card_type,
                    summary=card.summary,
                    content=card.content,
                    trigger_words=card.trigger_words,
                    use_for_character_creation=card.use_for_character_creation,
                    activation_mode=card.activation_mode,
                    priority=card.priority,
                    token_budget=card.token_budget,
                    metadata=card.metadata,
                    is_enabled=card.is_enabled,
                    sort_order=card.sort_order,
                )
            ScenarioVersionService.update_draft_hash(clone)
            return clone


class ScenarioVersionService:
    """Freezes mutable scenario drafts so adventures can keep stable ancestry and future diff/sync metadata."""

    @staticmethod
    def draft_payload(scenario: Scenario) -> dict:
        """Build the canonical serializable payload that represents a mutable draft."""
        return {
            "title": scenario.title,
            "description": scenario.description,
            "visibility": scenario.visibility,
            "tags": scenario.tags,
            "defaultModelConfigId": str(scenario.default_model_config_id) if scenario.default_model_config_id else None,
            "modules": [module_to_dict(m) for m in scenario.draft_modules.all()],
            "cards": [card_to_dict(c) for c in scenario.draft_cards.all()],
            "importMetadata": scenario.import_metadata,
        }

    @staticmethod
    def hash_payload(payload: dict) -> str:
        """Hash a draft/version payload for immutable version reuse and ancestry checks."""
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()

    @staticmethod
    def update_draft_hash(scenario: Scenario) -> str:
        """Persist the current draft hash after a meaningful draft content change."""
        digest = ScenarioVersionService.hash_payload(ScenarioVersionService.draft_payload(scenario))
        Scenario.objects.filter(id=scenario.id).update(draft_hash=digest)
        scenario.draft_hash = digest
        return digest

    @staticmethod
    def freeze(user, scenario: Scenario, change_note: str = "") -> ScenarioVersion:
        """Freeze the current draft into an immutable version unless identical content exists."""
        if scenario.owner_user_id != user.id:
            raise HttpError(404, "Scenario not found")
        payload = ScenarioVersionService.draft_payload(scenario)
        digest = ScenarioVersionService.hash_payload(payload)
        existing = ScenarioVersion.objects.filter(scenario=scenario, frozen_hash=digest).order_by("-version_number").first()
        if existing:
            return existing
        with transaction.atomic():
            version_number = (ScenarioVersion.objects.filter(scenario=scenario).order_by("-version_number").values_list("version_number", flat=True).first() or 0) + 1
            version = ScenarioVersion.objects.create(
                scenario=scenario,
                version_number=version_number,
                title=scenario.title,
                description=scenario.description,
                tags=scenario.tags,
                visibility=scenario.visibility,
                default_model_config=scenario.default_model_config,
                change_note=change_note,
                created_by=user,
                frozen_hash=digest,
                import_metadata=scenario.import_metadata,
            )
            for module in scenario.draft_modules.all():
                ScenarioModule.objects.create(
                    scenario_version=version,
                    module_type=module.module_type,
                    title=module.title,
                    content=module.content,
                    settings=module.settings,
                    sort_order=module.sort_order,
                    is_enabled=module.is_enabled,
                )
            for card in scenario.draft_cards.all():
                StoryCard.objects.create(
                    scenario_version=version,
                    title=card.title,
                    card_type=card.card_type,
                    summary=card.summary,
                    content=card.content,
                    trigger_words=card.trigger_words,
                    use_for_character_creation=card.use_for_character_creation,
                    activation_mode=card.activation_mode,
                    priority=card.priority,
                    token_budget=card.token_budget,
                    metadata=card.metadata,
                    is_enabled=card.is_enabled,
                    sort_order=card.sort_order,
                )
            Scenario.objects.filter(id=scenario.id).update(draft_hash=digest)
            return version


class StoryCardService:
    @staticmethod
    def create_draft_card(scenario: Scenario, payload: dict, index: int = 0) -> StoryCard:
        """Create a draft story card using native or AID-style field names."""
        return StoryCard.objects.create(
            scenario=scenario,
            title=payload.get("title") or payload.get("name") or "Untitled Card",
            card_type=payload.get("cardType") or payload.get("card_type") or payload.get("type") or "concept",
            summary=payload.get("summary") or payload.get("description") or "",
            content=payload.get("content") or payload.get("value") or payload.get("description") or "",
            trigger_words=normalize_triggers(payload.get("triggerWords", payload.get("keys", []))),
            use_for_character_creation=payload.get("useForCharacterCreation", False),
            activation_mode=payload.get("activationMode") or StoryCard.ActivationMode.TRIGGERED,
            priority=payload.get("priority", 100),
            token_budget=payload.get("tokenBudget"),
            metadata=payload.get("metadata") or {},
            is_enabled=payload.get("isEnabled", True),
            sort_order=payload.get("sortOrder", index * 10),
        )

    @staticmethod
    def update(card: StoryCard, payload: dict) -> StoryCard:
        """Patch a draft story card and refresh its parent scenario draft hash."""
        mapping = {
            "title": "title",
            "cardType": "card_type",
            "summary": "summary",
            "content": "content",
            "useForCharacterCreation": "use_for_character_creation",
            "activationMode": "activation_mode",
            "priority": "priority",
            "tokenBudget": "token_budget",
            "metadata": "metadata",
            "isEnabled": "is_enabled",
            "sortOrder": "sort_order",
        }
        for key, field in mapping.items():
            if key in payload:
                setattr(card, field, payload[key])
        if "triggerWords" in payload or "keys" in payload:
            card.trigger_words = normalize_triggers(payload.get("triggerWords", payload.get("keys")))
        card.save()
        ScenarioVersionService.update_draft_hash(card.scenario)
        return card
