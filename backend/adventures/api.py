from __future__ import annotations

from django.http import StreamingHttpResponse
from ninja import Body, Router
from ninja.errors import HttpError

from adventures.models import Adventure, AdventureMemory, AdventureStateEvent, AdventureSummary, AdventureTurn, GenerationVariant, PromptSnapshot, TokenUsage
from adventures.services import AdventureService, AdventureStateService, TurnService
from common.api import page_response, require_user
from common.time import iso
from scenarios.models import Scenario
from story_engine.hooks import StoryEngineHooks
from story_engine.services import GenerationService, run_async

router = Router(tags=["adventures"])


def adventure_dto(adventure: Adventure, include_state: bool = False) -> dict:
    """Serialize an adventure with ancestry metadata and optional reconstructed state."""
    data = {
        "id": str(adventure.id),
        "ownerUserId": str(adventure.owner_user_id),
        "scenarioId": str(adventure.scenario_id),
        "scenarioVersionId": str(adventure.scenario_version_id),
        "rootAdventureId": str(adventure.root_adventure_id) if adventure.root_adventure_id else None,
        "parentAdventureId": str(adventure.parent_adventure_id) if adventure.parent_adventure_id else None,
        "forkedFromTurnId": str(adventure.forked_from_turn_id) if adventure.forked_from_turn_id else None,
        "forkedFromTimelineSequence": adventure.forked_from_timeline_sequence,
        "forkedFromStateSequence": adventure.forked_from_state_sequence,
        "title": adventure.title,
        "status": adventure.status,
        "currentModelConfigId": str(adventure.current_model_config_id) if adventure.current_model_config_id else None,
        "createdAt": iso(adventure.created_at),
        "updatedAt": iso(adventure.updated_at),
        "lastPlayedAt": iso(adventure.last_played_at),
    }
    if include_state:
        state = AdventureStateService.reconstruct(adventure)
        data["state"] = state_dto(state)
        data["turns"] = [turn_dto(turn) for turn in adventure.turns.all()]
    return data


def state_dto(state) -> dict:
    """Serialize reconstructed adventure state for gameplay/editor panels."""
    return {
        "modules": state.modules,
        "cards": state.cards,
        "currentModelConfigId": state.current_model_config_id,
        "generationSettings": state.generation_settings,
        "stateSequence": state.state_sequence,
        "timelineSequence": state.timeline_sequence,
    }


def turn_dto(turn: AdventureTurn) -> dict:
    """Serialize a story turn with timeline, deletion, and variant metadata."""
    return {
        "id": str(turn.id),
        "adventureId": str(turn.adventure_id),
        "sequence": turn.sequence,
        "timelineSequence": turn.timeline_sequence,
        "stateSequence": turn.state_sequence,
        "role": turn.role,
        "actionType": turn.action_type or None,
        "content": turn.content,
        "responseGroupId": str(turn.response_group_id) if turn.response_group_id else None,
        "modelConfigId": str(turn.model_config_id) if turn.model_config_id else None,
        "promptSnapshotId": str(turn.prompt_snapshot_id) if turn.prompt_snapshot_id else None,
        "tokenUsageId": str(turn.token_usage_id) if turn.token_usage_id else None,
        "isDeleted": turn.is_deleted,
        "deletedAt": iso(turn.deleted_at),
        "createdAt": iso(turn.created_at),
        "updatedAt": iso(turn.updated_at),
    }


def variant_dto(variant: GenerationVariant) -> dict:
    """Serialize a retry generation variant without exposing prompt internals by default."""
    return {
        "id": str(variant.id),
        "responseGroupId": str(variant.response_group_id),
        "adventureId": str(variant.adventure_id),
        "content": variant.content,
        "retryInstruction": variant.retry_instruction,
        "includedVariantIds": variant.included_variant_ids,
        "modelConfigId": str(variant.model_config_id) if variant.model_config_id else None,
        "promptSnapshotId": str(variant.prompt_snapshot_id) if variant.prompt_snapshot_id else None,
        "tokenUsageId": str(variant.token_usage_id) if variant.token_usage_id else None,
        "isActive": variant.is_active,
        "archivedAt": iso(variant.archived_at),
        "createdAt": iso(variant.created_at),
    }


def event_dto(event: AdventureStateEvent) -> dict:
    """Serialize a meaningful state event for audit/debug/future diff views."""
    return {
        "id": str(event.id),
        "adventureId": str(event.adventure_id),
        "stateSequence": event.state_sequence,
        "timelineSequence": event.timeline_sequence,
        "effectiveFromTimelineSequence": event.effective_from_timeline_sequence,
        "eventType": event.event_type,
        "targetType": event.target_type,
        "targetId": event.target_id,
        "payload": event.payload,
        "createdById": str(event.created_by_id),
        "sourceTurnId": str(event.source_turn_id) if event.source_turn_id else None,
        "isInvalidated": event.is_invalidated,
        "invalidatedAt": iso(event.invalidated_at),
        "createdAt": iso(event.created_at),
    }


def prompt_snapshot_dto(snapshot: PromptSnapshot) -> dict:
    """Serialize prompt debug details for permission-gated inspection endpoints."""
    return {
        "id": str(snapshot.id),
        "adventureId": str(snapshot.adventure_id),
        "modelConfigId": str(snapshot.model_config_id) if snapshot.model_config_id else None,
        "generationIntent": snapshot.generation_intent,
        "stateSequence": snapshot.state_sequence,
        "contextLimit": snapshot.context_limit,
        "estimatedTokensByLayer": snapshot.estimated_tokens_by_layer,
        "includedModules": snapshot.included_modules,
        "activatedCards": snapshot.activated_cards,
        "includedSummaryIds": snapshot.included_summary_ids,
        "includedMemoryIds": snapshot.included_memory_ids,
        "includedTurnRange": snapshot.included_turn_range,
        "messages": snapshot.messages,
        "createdAt": iso(snapshot.created_at),
    }


def token_usage_dto(usage: TokenUsage) -> dict:
    """Serialize app-level token usage with safe provider/model metadata only."""
    return {
        "id": str(usage.id),
        "promptTokens": usage.prompt_tokens,
        "completionTokens": usage.completion_tokens,
        "visibleOutputTokens": usage.visible_output_tokens,
        "reasoningTokens": usage.reasoning_tokens,
        "cachedTokens": usage.cached_tokens,
        "totalTokens": usage.total_tokens,
        "estimatedCost": str(usage.estimated_cost) if usage.estimated_cost is not None else None,
        "provider": usage.provider,
        "modelId": usage.model_id,
        "rawMetadata": usage.raw_metadata,
        "createdAt": iso(usage.created_at),
    }


def summary_dto(summary: AdventureSummary | None) -> dict:
    """Serialize rough long-term adventure summary for manual/future worker updates."""
    if not summary:
        return {"id": None, "content": "", "sourceRangeMetadata": {}, "modelConfigId": None}
    return {
        "id": str(summary.id),
        "adventureId": str(summary.adventure_id),
        "content": summary.content,
        "sourceRangeMetadata": summary.source_range_metadata,
        "modelConfigId": str(summary.model_config_id) if summary.model_config_id else None,
        "createdAt": iso(summary.created_at),
        "updatedAt": iso(summary.updated_at),
    }


def memory_dto(memory: AdventureMemory) -> dict:
    """Serialize precise pinned or future extracted memory for context panels."""
    return {
        "id": str(memory.id),
        "adventureId": str(memory.adventure_id),
        "scope": memory.scope,
        "title": memory.title,
        "content": memory.content,
        "sourceTurnId": str(memory.source_turn_id) if memory.source_turn_id else None,
        "confidence": memory.confidence,
        "isPinned": memory.is_pinned,
        "metadata": memory.metadata,
        "createdAt": iso(memory.created_at),
        "updatedAt": iso(memory.updated_at),
    }


@router.get("/adventures")
def list_adventures(request, page: int = 1, limit: int = 50):
    """List active adventures owned by the authenticated user."""
    user = require_user(request)
    return page_response([adventure_dto(a) for a in AdventureService.queryset_for_user(user).exclude(status=Adventure.Status.DELETED)], page=page, limit=limit)


@router.post("/adventures/start")
def start_adventure(request, payload: dict = Body(...)):
    """Start a new adventure from a scenario, auto-freezing the draft if needed."""
    user = require_user(request)
    scenario = Scenario.objects.get(id=payload.get("scenarioId"), owner_user=user)
    return adventure_dto(AdventureService.start_from_scenario(user, scenario, payload.get("title")), include_state=True)


@router.get("/adventures/{adventure_id}")
def get_adventure(request, adventure_id: str):
    """Fetch an adventure with current state and all turns."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    return adventure_dto(adventure, include_state=True)


@router.patch("/adventures/{adventure_id}")
def update_adventure(request, adventure_id: str, payload: dict = Body(...)):
    """Patch adventure metadata such as title, status, or current model."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    if "title" in payload:
        adventure.title = payload["title"]
    if "status" in payload:
        adventure.status = payload["status"]
    if "currentModelConfigId" in payload:
        adventure.current_model_config_id = payload["currentModelConfigId"] or None
    adventure.save()
    return adventure_dto(adventure, include_state=True)


@router.delete("/adventures/{adventure_id}")
def delete_adventure(request, adventure_id: str):
    """Soft-delete an adventure from normal lists without destroying its records."""
    user = require_user(request)
    AdventureService.queryset_for_user(user).filter(id=adventure_id).update(status=Adventure.Status.DELETED)
    return {"ok": True}


@router.post("/adventures/{adventure_id}/archive")
def archive_adventure(request, adventure_id: str):
    """Archive an adventure while preserving it for future restore/export."""
    user = require_user(request)
    AdventureService.queryset_for_user(user).filter(id=adventure_id).update(status=Adventure.Status.ARCHIVED)
    return {"ok": True}


@router.get("/scenarios/{scenario_id}/adventures")
def list_scenario_adventures(request, scenario_id: str, page: int = 1, limit: int = 50):
    """List root adventures and forks for one scenario."""
    user = require_user(request)
    adventures = AdventureService.queryset_for_user(user).filter(scenario_id=scenario_id).exclude(status=Adventure.Status.DELETED)
    return page_response([adventure_dto(a) for a in adventures], page=page, limit=limit)


@router.post("/adventures/{adventure_id}/fork")
def fork_adventure(request, adventure_id: str, payload: dict = Body(...)):
    """Fork an adventure from a selected turn and materialize independent state."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    turn = adventure.turns.get(id=payload.get("fromTurnId"))
    fork = AdventureService.fork(user, adventure, turn, payload.get("title"))
    data = adventure_dto(fork, include_state=True)
    data["forkNote"] = payload.get("note") or ""
    data["switchToFork"] = bool(payload.get("switchToFork"))
    return data


@router.get("/adventures/{adventure_id}/state")
def get_state(request, adventure_id: str, timelineSequence: int = None, untilTurnId: str = "", mode: str = "active"):
    """Reconstruct adventure state in active or historical mode at an optional boundary."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    if untilTurnId:
        turn = adventure.turns.get(id=untilTurnId)
        timelineSequence = turn.timeline_sequence
    return state_dto(AdventureStateService.reconstruct(adventure, timeline_sequence=timelineSequence, mode=mode))


@router.get("/adventures/{adventure_id}/state-events")
def list_state_events(request, adventure_id: str, page: int = 1, limit: int = 50):
    """List state events for audit, inspection, and future diff tooling."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    return page_response([event_dto(e) for e in adventure.state_events.all()], page=page, limit=limit)


@router.get("/adventures/{adventure_id}/summary")
def get_summary(request, adventure_id: str):
    """Fetch the rough always-injected adventure summary, if one exists."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    return summary_dto(getattr(adventure, "summary", None))


@router.patch("/adventures/{adventure_id}/summary")
def update_summary(request, adventure_id: str, payload: dict = Body(...)):
    """Manually update summary content and record a meaningful state event seam."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    summary, _ = AdventureSummary.objects.get_or_create(adventure=adventure, defaults={"content": ""})
    before = summary.content
    summary.content = payload.get("content", "")
    summary.source_range_metadata = payload.get("sourceRangeMetadata") or summary.source_range_metadata
    summary.save()
    AdventureStateService.record_event(adventure, user, "summary.updated", "summary", str(summary.id), {"before": before, "after": summary.content})
    return summary_dto(summary)


@router.get("/adventures/{adventure_id}/memories")
def list_memories(request, adventure_id: str, page: int = 1, limit: int = 50):
    """List precise adventure memories for context injection/debug panels."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    return page_response([memory_dto(memory) for memory in adventure.memories.all()], page=page, limit=limit)


@router.post("/adventures/{adventure_id}/memories")
def create_memory(request, adventure_id: str, payload: dict = Body(...)):
    """Create a user-pinned memory; future extraction workers use the same durable seam."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    memory = AdventureMemory.objects.create(
        adventure=adventure,
        scope=payload.get("scope", "global"),
        title=payload.get("title") or "Memory",
        content=payload.get("content") or "",
        confidence=payload.get("confidence"),
        is_pinned=payload.get("isPinned", True),
        metadata=payload.get("metadata") or {},
    )
    AdventureStateService.record_event(adventure, user, "memory.created", "memory", str(memory.id), {"after": memory_dto(memory)})
    return memory_dto(memory)


@router.patch("/adventures/{adventure_id}/memories/{memory_id}")
def update_memory(request, adventure_id: str, memory_id: str, payload: dict = Body(...)):
    """Patch a memory while preserving event provenance for future diff/debug tools."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    memory = adventure.memories.get(id=memory_id)
    before = memory_dto(memory)
    for key, field in {"scope": "scope", "title": "title", "content": "content", "confidence": "confidence", "isPinned": "is_pinned", "metadata": "metadata"}.items():
        if key in payload:
            setattr(memory, field, payload[key])
    memory.save()
    AdventureStateService.record_event(adventure, user, "memory.updated", "memory", str(memory.id), {"before": before, "after": memory_dto(memory)})
    return memory_dto(memory)


@router.delete("/adventures/{adventure_id}/memories/{memory_id}")
def delete_memory(request, adventure_id: str, memory_id: str):
    """Delete a memory and record its removal as a meaningful state event."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    memory = adventure.memories.get(id=memory_id)
    before = memory_dto(memory)
    memory.delete()
    AdventureStateService.record_event(adventure, user, "memory.deleted", "memory", memory_id, {"before": before, "after": None})
    return {"ok": True}


@router.post("/adventures/{adventure_id}/state/modules/reorder")
def reorder_adventure_modules(request, adventure_id: str, payload: dict = Body(...)):
    """Record adventure-local module ordering as state events for reconstruction and forks."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    state = AdventureStateService.reconstruct(adventure)
    modules_by_id = {str(module.get("id")): dict(module) for module in state.modules}
    events = []
    for index, module_id in enumerate(payload.get("moduleIds") or []):
        if module_id in modules_by_id:
            updated = {**modules_by_id[module_id], "sortOrder": index * 10}
            events.append(AdventureStateService.update_module(adventure, user, module_id, updated))
    return {"ok": True, "events": [event_dto(event) for event in events]}


@router.patch("/adventures/{adventure_id}/state/modules/{module_id}")
def update_adventure_module(request, adventure_id: str, module_id: str, payload: dict = Body(...)):
    """Record an adventure-local module edit as a state event."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    event = AdventureStateService.update_module(adventure, user, module_id, payload)
    return event_dto(event)


@router.post("/adventures/{adventure_id}/state/cards")
def create_adventure_card(request, adventure_id: str, payload: dict = Body(...)):
    """Record an adventure-local card creation as a state event."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    card_id = payload.get("id") or f"card-local-{adventure.state_events.count() + 1}"
    payload["id"] = card_id
    return event_dto(AdventureStateService.update_card(adventure, user, card_id, payload))


@router.patch("/adventures/{adventure_id}/state/cards/{card_id}")
def update_adventure_card(request, adventure_id: str, card_id: str, payload: dict = Body(...)):
    """Record an adventure-local card update as a state event."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    payload["id"] = card_id
    return event_dto(AdventureStateService.update_card(adventure, user, card_id, payload))


@router.delete("/adventures/{adventure_id}/state/cards/{card_id}")
def delete_adventure_card(request, adventure_id: str, card_id: str):
    """Record an adventure-local card delete as a state event."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    state = AdventureStateService.reconstruct(adventure)
    before = next((c for c in state.cards if str(c.get("id")) == card_id), None)
    event = AdventureStateService.record_event(adventure, user, "card.deleted", "card", card_id, {"before": before, "after": None})
    return event_dto(event)


@router.patch("/adventures/{adventure_id}/state/model-settings")
def update_model_settings(request, adventure_id: str, payload: dict = Body(...)):
    """Record model and generation setting changes as reconstructable state events."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    events = []
    if "modelConfigId" in payload:
        model_config_id = payload.get("modelConfigId")
        adventure.current_model_config_id = model_config_id or None
        adventure.save(update_fields=["current_model_config"])
        events.append(AdventureStateService.record_event(adventure, user, "model.changed", "model_config", str(model_config_id or ""), {"modelConfigId": model_config_id}))
    if "generationSettings" in payload:
        before = AdventureStateService.reconstruct(adventure).generation_settings
        after = payload.get("generationSettings") or {}
        events.append(AdventureStateService.record_event(adventure, user, "generation_settings.changed", "generation_settings", str(adventure.id), {"before": before, "after": after}))
    if not events:
        raise HttpError(400, "No modelConfigId or generationSettings supplied")
    return {"ok": True, "events": [event_dto(event) for event in events]}


@router.post("/adventures/{adventure_id}/state/cards/reorder")
def reorder_adventure_cards(request, adventure_id: str, payload: dict = Body(...)):
    """Record adventure-local card ordering as individual state events for reconstruction."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    state = AdventureStateService.reconstruct(adventure)
    cards_by_id = {str(card.get("id")): dict(card) for card in state.cards}
    events = []
    for index, card_id in enumerate(payload.get("cardIds") or []):
        if card_id in cards_by_id:
            updated = {**cards_by_id[card_id], "sortOrder": index * 10}
            events.append(AdventureStateService.update_card(adventure, user, card_id, updated))
    return {"ok": True, "events": [event_dto(event) for event in events]}


@router.get("/adventures/{adventure_id}/turns")
def list_turns(request, adventure_id: str, page: int = 1, limit: int = 50):
    """List all turns including soft-deleted records for restore/debug UI."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    return page_response([turn_dto(t) for t in adventure.turns.all()], page=page, limit=limit)


@router.patch("/adventures/{adventure_id}/turns/{turn_id}")
def update_turn(request, adventure_id: str, turn_id: str, payload: dict = Body(...)):
    """Edit a turn's text while keeping its timeline identity stable."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    turn = adventure.turns.get(id=turn_id)
    if "content" in payload:
        turn.content = payload["content"]
    turn.save(update_fields=["content", "updated_at"])
    return turn_dto(turn)


@router.delete("/adventures/{adventure_id}/turns/{turn_id}")
def delete_turn(request, adventure_id: str, turn_id: str, payload: dict | None = Body(None)):
    """Soft-delete one turn or from-here with optional state event invalidation."""
    user = require_user(request)
    payload = payload or {}
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    turn = adventure.turns.get(id=turn_id)
    TurnService.delete(user, adventure, turn, payload.get("mode", "from_here"), payload.get("revertStateChangesAfterPoint", False))
    return {"ok": True}


@router.post("/adventures/{adventure_id}/turns/{turn_id}/restore")
def restore_turn(request, adventure_id: str, turn_id: str, payload: dict | None = Body(None)):
    """Restore one soft-deleted turn or the range from that turn onward."""
    user = require_user(request)
    payload = payload or {}
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    turn = adventure.turns.get(id=turn_id)
    TurnService.restore(user, adventure, turn, payload.get("mode", "from_here"), payload.get("restoreStateChangesAfterPoint", False))
    return {"ok": True}


@router.post("/adventures/{adventure_id}/generate")
def generate(request, adventure_id: str, payload: dict = Body(...)):
    """Run a non-streaming Do/Say/Story generation for tests and fallback clients."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    result = GenerationService().generate(
        user,
        adventure,
        "player_action",
        action_type=payload.get("actionType", "do"),
        content=payload.get("content", ""),
        model_config_id=payload.get("modelConfigId"),
        generation_settings=payload.get("generationSettings") or {},
    )
    return {"turn": turn_dto(result["turn"]), "userTurn": turn_dto(result["userTurn"]), "variant": variant_dto(result["variant"])}


@router.post("/adventures/{adventure_id}/continue")
def continue_generation(request, adventure_id: str, payload: dict | None = Body(None)):
    """Run a non-streaming Continue generation."""
    user = require_user(request)
    payload = payload or {}
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    result = GenerationService().generate(user, adventure, "continue", model_config_id=payload.get("modelConfigId"), generation_settings=payload.get("generationSettings") or {})
    return {"turn": turn_dto(result["turn"]), "variant": variant_dto(result["variant"])}


@router.post("/adventures/{adventure_id}/retry")
def retry_generation(request, adventure_id: str, payload: dict = Body(...)):
    """Run a non-streaming guided retry and archive it as a variant."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    result = GenerationService().generate(
        user,
        adventure,
        "retry",
        model_config_id=payload.get("modelConfigId"),
        generation_settings=payload.get("generationSettings") or {},
        retry_instruction=payload.get("retryInstruction", ""),
        response_group_id=payload.get("responseGroupId"),
        include_variant_ids=payload.get("includeVariantIds") or [],
    )
    return {"variant": variant_dto(result["variant"])}


@router.post("/adventures/{adventure_id}/generate-stream")
def generate_stream(request, adventure_id: str, payload: dict = Body(...)):
    """Stream a Do/Say/Story generation using the rewrite SSE event contract."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    generator = GenerationService().generate_stream(user, adventure, "player_action", action_type=payload.get("actionType", "do"), content=payload.get("content", ""), model_config_id=payload.get("modelConfigId"), generation_settings=payload.get("generationSettings") or {})
    return StreamingHttpResponse(generator, content_type="text/event-stream")


@router.post("/adventures/{adventure_id}/continue-stream")
def continue_stream(request, adventure_id: str, payload: dict | None = Body(None)):
    """Stream a Continue generation using the rewrite SSE event contract."""
    user = require_user(request)
    payload = payload or {}
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    generator = GenerationService().generate_stream(user, adventure, "continue", model_config_id=payload.get("modelConfigId"), generation_settings=payload.get("generationSettings") or {})
    return StreamingHttpResponse(generator, content_type="text/event-stream")


@router.post("/adventures/{adventure_id}/retry-stream")
def retry_stream(request, adventure_id: str, payload: dict = Body(...)):
    """Stream a guided retry and save the final output as a variant."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    generator = GenerationService().generate_stream(user, adventure, "retry", model_config_id=payload.get("modelConfigId"), generation_settings=payload.get("generationSettings") or {}, retry_instruction=payload.get("retryInstruction", ""), response_group_id=payload.get("responseGroupId"), include_variant_ids=payload.get("includeVariantIds") or [])
    return StreamingHttpResponse(generator, content_type="text/event-stream")


@router.post("/adventures/{adventure_id}/variants/{variant_id}/select")
def select_variant(request, adventure_id: str, variant_id: str):
    """Select a retry variant and update the canonical assistant turn for its response group."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    variant = adventure.generation_variants.select_related("response_group").get(id=variant_id)
    GenerationVariant.objects.filter(response_group=variant.response_group).exclude(id=variant.id).update(is_active=False)
    variant.is_active = True
    variant.archived_at = None
    variant.save(update_fields=["is_active", "archived_at"])
    variant.response_group.active_variant = variant
    variant.response_group.save(update_fields=["active_variant"])
    turn = variant.response_group.turns.filter(role=AdventureTurn.Role.ASSISTANT).first()
    if turn:
        turn.content = variant.content
        turn.prompt_snapshot = variant.prompt_snapshot
        turn.token_usage = variant.token_usage
        turn.save(update_fields=["content", "prompt_snapshot", "token_usage", "updated_at"])
    run_async(StoryEngineHooks().after_variant_selected({"user": user, "adventure": adventure, "variant": variant, "turn": turn}))
    return {"variant": variant_dto(variant), "turn": turn_dto(turn) if turn else None}


@router.get("/adventures/{adventure_id}/variants")
def list_variants(request, adventure_id: str, responseGroupId: str = "", page: int = 1, limit: int = 50):
    """List retry variants for an adventure, optionally scoped to one response group."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    variants = adventure.generation_variants.select_related("response_group").all()
    if responseGroupId:
        variants = variants.filter(response_group_id=responseGroupId)
    return page_response([variant_dto(variant) for variant in variants.order_by("created_at")], page=page, limit=limit)


@router.get("/adventures/{adventure_id}/turns/{turn_id}/prompt-snapshot")
def get_prompt_snapshot(request, adventure_id: str, turn_id: str):
    """Fetch the prompt snapshot for a generated assistant turn."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    turn = adventure.turns.get(id=turn_id)
    if not turn.prompt_snapshot:
        raise HttpError(404, "Prompt snapshot not found")
    return prompt_snapshot_dto(turn.prompt_snapshot)


@router.get("/adventures/{adventure_id}/turns/{turn_id}/token-usage")
def get_token_usage(request, adventure_id: str, turn_id: str):
    """Fetch token usage for a generated assistant turn."""
    user = require_user(request)
    adventure = AdventureService.queryset_for_user(user).get(id=adventure_id)
    turn = adventure.turns.get(id=turn_id)
    if not turn.token_usage:
        raise HttpError(404, "Token usage not found")
    return token_usage_dto(turn.token_usage)


@router.get("/adventures/{adventure_id}/turns/{turn_id}/context-report")
def get_context_report(request, adventure_id: str, turn_id: str):
    """Return prompt-layer context report fields for gameplay Inspect panels."""
    snapshot = get_prompt_snapshot(request, adventure_id, turn_id)
    return {
        "includedModules": snapshot["includedModules"],
        "activatedCards": snapshot["activatedCards"],
        "includedSummaryIds": snapshot["includedSummaryIds"],
        "includedMemoryIds": snapshot["includedMemoryIds"],
        "includedTurnRange": snapshot["includedTurnRange"],
        "estimatedTokensByLayer": snapshot["estimatedTokensByLayer"],
        "modelConfigId": snapshot["modelConfigId"],
    }
