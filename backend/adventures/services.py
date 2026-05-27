from __future__ import annotations

import copy
import hashlib
import json
from dataclasses import dataclass

from django.db import transaction
from django.utils import timezone
from ninja.errors import HttpError

from adventures.models import Adventure, AdventureSnapshotBase, AdventureStateEvent, AdventureTurn
from scenarios.models import Scenario
from scenarios.services import ScenarioVersionService, card_to_dict, module_to_dict


def next_timeline(adventure: Adventure) -> int:
    """Return the next append-only timeline slot across turns and state events."""
    turn_max = adventure.turns.order_by("-timeline_sequence").values_list("timeline_sequence", flat=True).first() or 0
    event_max = adventure.state_events.order_by("-timeline_sequence").values_list("timeline_sequence", flat=True).first() or 0
    return max(turn_max, event_max) + 1


def next_turn_sequence(adventure: Adventure) -> int:
    """Return the next visible story turn sequence for an adventure."""
    return (adventure.turns.order_by("-sequence").values_list("sequence", flat=True).first() or 0) + 1


def next_state_sequence(adventure: Adventure) -> int:
    """Return the next state-event sequence used by reconstruction boundaries."""
    return (adventure.state_events.order_by("-state_sequence").values_list("state_sequence", flat=True).first() or 0) + 1


@dataclass
class ReconstructedState:
    """Materialized adventure state at a timeline boundary for prompts and forks."""

    modules: list[dict]
    cards: list[dict]
    current_model_config_id: str | None
    state_sequence: int
    timeline_sequence: int

    def stable_hash(self) -> str:
        """Hash reconstructed state for future fork/diff/sync comparisons."""
        payload = {"modules": self.modules, "cards": self.cards, "currentModelConfigId": self.current_model_config_id}
        return hashlib.sha256(json.dumps(payload, sort_keys=True, default=str).encode("utf-8")).hexdigest()


class AdventureService:
    """Creates independent adventure snapshots so scenario edits and forks never share live mutable state."""

    @staticmethod
    def queryset_for_user(user):
        """Return adventures owned by the current user."""
        return Adventure.objects.filter(owner_user=user).select_related("scenario", "scenario_version", "current_model_config")

    @staticmethod
    def start_from_scenario(user, scenario: Scenario, title: str | None = None) -> Adventure:
        """Freeze a scenario draft if needed and create an independent playable adventure."""
        if scenario.owner_user_id != user.id:
            raise HttpError(404, "Scenario not found")
        version = ScenarioVersionService.freeze(user, scenario, "Auto-freeze for adventure start")
        with transaction.atomic():
            adventure = Adventure.objects.create(
                owner_user=user,
                scenario=scenario,
                scenario_version=version,
                title=title or version.title,
                current_model_config=version.default_model_config,
            )
            modules = [module_to_dict(m) for m in version.modules.all()]
            cards = [card_to_dict(c) for c in version.cards.all()]
            opening_scene = next((m["content"] for m in modules if m["moduleType"] == "opening_scene" and m["isEnabled"]), "")
            AdventureSnapshotBase.objects.create(
                adventure=adventure,
                scenario_title=version.title,
                scenario_description=version.description,
                scenario_tags=version.tags,
                modules=modules,
                cards=cards,
                starting_model_config_id=version.default_model_config_id,
                opening_scene=opening_scene,
                import_metadata=version.import_metadata,
            )
            AdventureStateService.record_event(
                adventure=adventure,
                user=user,
                event_type="adventure.started",
                target_type="adventure",
                target_id=str(adventure.id),
                payload={"scenarioVersionId": str(version.id)},
            )
            if opening_scene:
                AdventureTurn.objects.create(
                    adventure=adventure,
                    sequence=next_turn_sequence(adventure),
                    timeline_sequence=next_timeline(adventure),
                    state_sequence=next_state_sequence(adventure) - 1,
                    role=AdventureTurn.Role.ASSISTANT,
                    action_type="",
                    content=opening_scene,
                    model_config=version.default_model_config,
                )
            return adventure

    @staticmethod
    def fork(user, adventure: Adventure, from_turn: AdventureTurn, title: str | None = None) -> Adventure:
        """Create a fork by reconstructing active state and copying canonical turns to a new adventure."""
        if adventure.owner_user_id != user.id or from_turn.adventure_id != adventure.id:
            raise HttpError(404, "Adventure turn not found")
        state = AdventureStateService.reconstruct(adventure, timeline_sequence=from_turn.timeline_sequence, mode="active")
        with transaction.atomic():
            fork = Adventure.objects.create(
                owner_user=user,
                scenario=adventure.scenario,
                scenario_version=adventure.scenario_version,
                root_adventure=adventure.root_adventure or adventure,
                parent_adventure=adventure,
                forked_from_turn=from_turn,
                forked_from_timeline_sequence=from_turn.timeline_sequence,
                forked_from_state_sequence=from_turn.state_sequence,
                forked_from_state_hash=state.stable_hash(),
                title=title or f"{adventure.title} Fork",
                current_model_config=adventure.current_model_config,
            )
            AdventureSnapshotBase.objects.create(
                adventure=fork,
                scenario_title=adventure.snapshot_base.scenario_title,
                scenario_description=adventure.snapshot_base.scenario_description,
                scenario_tags=copy.deepcopy(adventure.snapshot_base.scenario_tags),
                modules=copy.deepcopy(state.modules),
                cards=copy.deepcopy(state.cards),
                starting_model_config_id=adventure.current_model_config_id,
                opening_scene=adventure.snapshot_base.opening_scene,
                import_metadata=copy.deepcopy(adventure.snapshot_base.import_metadata),
            )
            for turn in adventure.turns.filter(timeline_sequence__lte=from_turn.timeline_sequence, is_deleted=False).order_by("sequence"):
                AdventureTurn.objects.create(
                    adventure=fork,
                    sequence=next_turn_sequence(fork),
                    timeline_sequence=next_timeline(fork),
                    state_sequence=state.state_sequence,
                    role=turn.role,
                    action_type=turn.action_type,
                    content=turn.content,
                    model_config=turn.model_config,
                )
            AdventureStateService.record_event(
                adventure=fork,
                user=user,
                event_type="adventure.forked",
                target_type="adventure",
                target_id=str(fork.id),
                payload={"parentAdventureId": str(adventure.id), "forkedFromTurnId": str(from_turn.id)},
            )
            return fork


class AdventureStateService:
    """Reconstructs active or historical state from snapshot base plus append-only state events."""

    @staticmethod
    def record_event(adventure: Adventure, user, event_type: str, target_type: str, target_id: str, payload: dict) -> AdventureStateEvent:
        """Append a meaningful state event without mutating prior history."""
        timeline = next_timeline(adventure)
        state_sequence = next_state_sequence(adventure)
        return AdventureStateEvent.objects.create(
            adventure=adventure,
            state_sequence=state_sequence,
            timeline_sequence=timeline,
            effective_from_timeline_sequence=timeline,
            event_type=event_type,
            target_type=target_type,
            target_id=target_id,
            payload=payload,
            created_by=user,
        )

    @staticmethod
    def reconstruct(adventure: Adventure, timeline_sequence: int | None = None, mode: str = "active") -> ReconstructedState:
        """Rebuild adventure-local modules/cards/model state from snapshot plus events."""
        snapshot = adventure.snapshot_base
        modules = copy.deepcopy(snapshot.modules)
        cards = copy.deepcopy(snapshot.cards)
        current_model_config_id = str(adventure.current_model_config_id) if adventure.current_model_config_id else None
        qs = adventure.state_events.all()
        if timeline_sequence is not None:
            qs = qs.filter(timeline_sequence__lte=timeline_sequence)
        if mode == "active":
            qs = qs.filter(is_invalidated=False)
        latest_state = 0
        latest_timeline = 0
        for event in qs.order_by("timeline_sequence", "state_sequence"):
            latest_state = max(latest_state, event.state_sequence)
            latest_timeline = max(latest_timeline, event.timeline_sequence)
            after = event.payload.get("after")
            if event.event_type.startswith("module."):
                modules = AdventureStateService._apply_collection_event(modules, event, after)
            elif event.event_type.startswith("card."):
                cards = AdventureStateService._apply_collection_event(cards, event, after)
            elif event.event_type == "model.changed":
                current_model_config_id = event.payload.get("modelConfigId")
        return ReconstructedState(modules=modules, cards=cards, current_model_config_id=current_model_config_id, state_sequence=latest_state, timeline_sequence=latest_timeline)

    @staticmethod
    def _apply_collection_event(items: list[dict], event: AdventureStateEvent, after: dict | None) -> list[dict]:
        """Apply a module/card create, update, or delete event to a reconstructed collection."""
        target_id = event.target_id
        if event.event_type.endswith(".deleted"):
            return [item for item in items if str(item.get("id")) != target_id]
        if not after:
            return items
        found = False
        new_items = []
        for item in items:
            if str(item.get("id")) == target_id:
                new_items.append(after)
                found = True
            else:
                new_items.append(item)
        if not found and event.event_type.endswith(".created"):
            new_items.append(after)
        return new_items

    @staticmethod
    def update_card(adventure: Adventure, user, card_id: str, after: dict) -> AdventureStateEvent:
        """Record an adventure-local card create/update event instead of mutating snapshots."""
        state = AdventureStateService.reconstruct(adventure)
        before = next((c for c in state.cards if str(c.get("id")) == card_id), None)
        event_type = "card.updated" if before else "card.created"
        return AdventureStateService.record_event(adventure, user, event_type, "card", card_id, {"before": before, "after": after})

    @staticmethod
    def update_module(adventure: Adventure, user, module_id: str, after: dict) -> AdventureStateEvent:
        """Record an adventure-local module create/update event instead of mutating snapshots."""
        state = AdventureStateService.reconstruct(adventure)
        before = next((m for m in state.modules if str(m.get("id")) == module_id), None)
        event_type = "module.updated" if before else "module.created"
        return AdventureStateService.record_event(adventure, user, event_type, "module", module_id, {"before": before, "after": after})


class TurnService:
    """Soft deletion preserves timeline order for restore, audit, fork, and future diff/sync tools."""

    @staticmethod
    def active_turns(adventure: Adventure):
        """Return canonical non-deleted turns for prompt building and gameplay display."""
        return adventure.turns.filter(is_deleted=False).order_by("sequence")

    @staticmethod
    def delete(user, adventure: Adventure, turn: AdventureTurn, mode: str = "from_here", revert_state_changes_after_point: bool = False):
        """Soft-delete one turn or all later turns, optionally invalidating later state events."""
        if adventure.owner_user_id != user.id or turn.adventure_id != adventure.id:
            raise HttpError(404, "Turn not found")
        qs = adventure.turns.filter(sequence__gte=turn.sequence) if mode == "from_here" else adventure.turns.filter(id=turn.id)
        qs.update(is_deleted=True, deleted_at=timezone.now())
        if mode == "from_here" and revert_state_changes_after_point:
            adventure.state_events.filter(timeline_sequence__gt=turn.timeline_sequence).update(
                is_invalidated=True,
                invalidated_by_operation_id=f"turn-delete:{turn.id}",
                invalidated_at=timezone.now(),
            )

    @staticmethod
    def restore(user, adventure: Adventure, turn: AdventureTurn, mode: str = "from_here"):
        """Restore one soft-deleted turn or the range from that turn onward."""
        if adventure.owner_user_id != user.id or turn.adventure_id != adventure.id:
            raise HttpError(404, "Turn not found")
        qs = adventure.turns.filter(sequence__gte=turn.sequence) if mode == "from_here" else adventure.turns.filter(id=turn.id)
        qs.update(is_deleted=False, deleted_at=None)
