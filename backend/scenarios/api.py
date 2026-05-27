from __future__ import annotations

from ninja import Body, Router
from ninja.errors import HttpError

from common.api import page_response, require_user
from common.time import iso
from scenarios.models import Scenario, ScenarioModule, ScenarioVersion, StoryCard
from scenarios.services import ScenarioService, ScenarioVersionService, StoryCardService, card_to_dict, module_to_dict

router = Router(tags=["scenarios"])


def scenario_dto(scenario: Scenario, include_draft: bool = False) -> dict:
    """Serialize scenario metadata and optionally its mutable draft content."""
    data = {
        "id": str(scenario.id),
        "ownerUserId": str(scenario.owner_user_id),
        "title": scenario.title,
        "description": scenario.description,
        "visibility": scenario.visibility,
        "tags": scenario.tags,
        "defaultModelConfigId": str(scenario.default_model_config_id) if scenario.default_model_config_id else None,
        "createdAt": iso(scenario.created_at),
        "updatedAt": iso(scenario.updated_at),
    }
    if include_draft:
        data["modules"] = [module_to_dict(m) for m in scenario.draft_modules.all()]
        data["cards"] = [card_to_dict(c) for c in scenario.draft_cards.all()]
    return data


def version_dto(version: ScenarioVersion, include_content: bool = False) -> dict:
    """Serialize immutable scenario version metadata and optional frozen content."""
    data = {
        "id": str(version.id),
        "scenarioId": str(version.scenario_id),
        "versionNumber": version.version_number,
        "title": version.title,
        "description": version.description,
        "tags": version.tags,
        "visibility": version.visibility,
        "changeNote": version.change_note,
        "createdById": str(version.created_by_id),
        "createdAt": iso(version.created_at),
    }
    if include_content:
        data["modules"] = [module_to_dict(m) for m in version.modules.all()]
        data["cards"] = [card_to_dict(c) for c in version.cards.all()]
    return data


@router.get("/scenarios")
def list_scenarios(request):
    """List scenarios owned by the authenticated user."""
    user = require_user(request)
    return page_response([scenario_dto(s) for s in ScenarioService.queryset_for_user(user)])


@router.post("/scenarios")
def create_scenario(request, payload: dict = Body(...)):
    """Create a new mutable scenario draft."""
    user = require_user(request)
    return scenario_dto(ScenarioService.create(user, payload), include_draft=True)


@router.get("/scenarios/{scenario_id}")
def get_scenario(request, scenario_id: str):
    """Fetch a scenario with its draft modules and cards."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).filter(id=scenario_id).first()
    if not scenario:
        raise HttpError(404, "Scenario not found")
    return scenario_dto(scenario, include_draft=True)


@router.patch("/scenarios/{scenario_id}")
def update_scenario(request, scenario_id: str, payload: dict = Body(...)):
    """Patch scenario draft metadata."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    return scenario_dto(ScenarioService.update(user, scenario, payload), include_draft=True)


@router.delete("/scenarios/{scenario_id}")
def delete_scenario(request, scenario_id: str):
    """Delete a user-owned scenario draft and related versions if allowed."""
    user = require_user(request)
    ScenarioService.queryset_for_user(user).filter(id=scenario_id).delete()
    return {"ok": True}


@router.post("/scenarios/{scenario_id}/duplicate")
def duplicate_scenario(request, scenario_id: str, payload: dict | None = Body(None)):
    """Duplicate a scenario draft without copying adventures."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    return scenario_dto(ScenarioService.duplicate(user, scenario, (payload or {}).get("title")), include_draft=True)


@router.post("/scenarios/{scenario_id}/freeze-version")
def freeze_version(request, scenario_id: str, payload: dict | None = Body(None)):
    """Create or reuse an immutable version of the current scenario draft."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    return version_dto(ScenarioVersionService.freeze(user, scenario, (payload or {}).get("changeNote", "")), include_content=True)


@router.get("/scenarios/{scenario_id}/versions")
def list_versions(request, scenario_id: str):
    """List immutable versions for a user-owned scenario."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    return page_response([version_dto(v) for v in scenario.versions.all()])


@router.get("/scenarios/{scenario_id}/versions/{version_id}")
def get_version(request, scenario_id: str, version_id: str):
    """Fetch one immutable scenario version with modules and cards."""
    user = require_user(request)
    ScenarioService.queryset_for_user(user).get(id=scenario_id)
    version = ScenarioVersion.objects.get(id=version_id, scenario_id=scenario_id)
    return version_dto(version, include_content=True)


@router.get("/scenarios/{scenario_id}/draft/modules")
def list_modules(request, scenario_id: str):
    """List mutable draft modules for a scenario."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    return page_response([module_to_dict(m) for m in scenario.draft_modules.all()])


@router.post("/scenarios/{scenario_id}/draft/modules")
def create_module(request, scenario_id: str, payload: dict = Body(...)):
    """Create a new mutable draft module for a scenario."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    module = ScenarioModule.objects.create(
        scenario=scenario,
        module_type=payload.get("moduleType") or "custom",
        title=payload.get("title") or "Module",
        content=payload.get("content") or "",
        settings=payload.get("settings") or {},
        sort_order=payload.get("sortOrder", 100),
        is_enabled=payload.get("isEnabled", True),
    )
    ScenarioVersionService.update_draft_hash(scenario)
    return module_to_dict(module)


@router.patch("/scenario-modules/{module_id}")
def update_module(request, module_id: str, payload: dict = Body(...)):
    """Patch a mutable draft module."""
    user = require_user(request)
    module = ScenarioModule.objects.select_related("scenario").get(id=module_id, scenario__owner_user=user)
    for key, field in {"moduleType": "module_type", "title": "title", "content": "content", "settings": "settings", "sortOrder": "sort_order", "isEnabled": "is_enabled"}.items():
        if key in payload:
            setattr(module, field, payload[key])
    module.save()
    ScenarioVersionService.update_draft_hash(module.scenario)
    return module_to_dict(module)


@router.delete("/scenario-modules/{module_id}")
def delete_module(request, module_id: str):
    """Delete a mutable draft module."""
    user = require_user(request)
    module = ScenarioModule.objects.select_related("scenario").get(id=module_id, scenario__owner_user=user)
    scenario = module.scenario
    module.delete()
    ScenarioVersionService.update_draft_hash(scenario)
    return {"ok": True}


@router.get("/scenarios/{scenario_id}/draft/cards")
def list_cards(request, scenario_id: str):
    """List mutable draft story cards for a scenario."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    return page_response([card_to_dict(c) for c in scenario.draft_cards.all()])


@router.post("/scenarios/{scenario_id}/draft/cards")
def create_card(request, scenario_id: str, payload: dict = Body(...)):
    """Create an AID-compatible mutable draft story card."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    card = StoryCardService.create_draft_card(scenario, payload, scenario.draft_cards.count())
    ScenarioVersionService.update_draft_hash(scenario)
    return card_to_dict(card)


@router.patch("/story-cards/{card_id}")
def update_card(request, card_id: str, payload: dict = Body(...)):
    """Patch a mutable draft story card."""
    user = require_user(request)
    card = StoryCard.objects.select_related("scenario").get(id=card_id, scenario__owner_user=user)
    return card_to_dict(StoryCardService.update(card, payload))


@router.delete("/story-cards/{card_id}")
def delete_card(request, card_id: str):
    """Delete a mutable draft story card."""
    user = require_user(request)
    card = StoryCard.objects.select_related("scenario").get(id=card_id, scenario__owner_user=user)
    scenario = card.scenario
    card.delete()
    ScenarioVersionService.update_draft_hash(scenario)
    return {"ok": True}


@router.get("/scenarios/{scenario_id}/versions/{version_id}/modules")
def version_modules(request, scenario_id: str, version_id: str):
    """List read-only modules from an immutable scenario version."""
    user = require_user(request)
    ScenarioService.queryset_for_user(user).get(id=scenario_id)
    version = ScenarioVersion.objects.get(id=version_id, scenario_id=scenario_id)
    return page_response([module_to_dict(m) for m in version.modules.all()])


@router.get("/scenarios/{scenario_id}/versions/{version_id}/cards")
def version_cards(request, scenario_id: str, version_id: str):
    """List read-only story cards from an immutable scenario version."""
    user = require_user(request)
    ScenarioService.queryset_for_user(user).get(id=scenario_id)
    version = ScenarioVersion.objects.get(id=version_id, scenario_id=scenario_id)
    return page_response([card_to_dict(c) for c in version.cards.all()])


@router.get("/scenarios/{scenario_id}/export")
def export_scenario(request, scenario_id: str):
    """Export a native ImaginAI scenario draft without secrets or private provider data."""
    user = require_user(request)
    scenario = ScenarioService.queryset_for_user(user).get(id=scenario_id)
    return {"schemaVersion": 1, "scenario": scenario_dto(scenario, include_draft=True)}
