# Adventure Timeline And State

## Purpose

The adventure state system supports:

- adventure-local prompt/card/model changes
- fork from any turn
- forks of forks
- delete/restore turns
- retry variants
- future diff/sync/cherry-pick
- future scripts/stats/memory-derived state

The system must be robust enough to answer: "What did this adventure look like at this point in time?"

## Core Principle: Append-Only Timeline

Adventure history has a stable append-only timeline beneath story turns and state changes.

Example:

```text
timeline 1: assistant opening turn
timeline 2: player turn
timeline 3: assistant turn
timeline 4: card edited
timeline 5: player turn
timeline 6: assistant turn
timeline 7: module edited
timeline 8: player turn
```

Turns and state events are different records, but both occupy timeline positions.

Deleting a turn does not erase the timeline. It changes the active story projection.

## Adventure Snapshot Base

Every adventure has a materialized base snapshot.

For root adventures, it is copied from a scenario version.

For forks, it is reconstructed from the parent adventure at the fork boundary and then materialized as a new independent base snapshot.

This avoids replaying parent history forever and keeps forks independent.

## State Events

Only meaningful adventure data changes create state events.

Record events for:

- module created/updated/deleted/enabled/disabled/reordered
- card created/updated/deleted/enabled/disabled/reordered
- model changed
- generation settings changed
- memory/summary changes later
- script/stat changes later
- import applied
- adventure forked/started

Do not record events for:

- cursor movement
- open/closed panels
- temporary drafts
- unsaved form state
- scroll/focus
- token estimate recalculation
- rendered markdown
- frontend-only UI state

## Event Shape

Conceptual fields:

```text
AdventureStateEvent
- id
- adventure_id
- state_sequence
- timeline_sequence
- effective_from_timeline_sequence
- event_type
- target_type
- target_id
- payload
- created_by_id
- source_turn_id, optional
- is_invalidated
- invalidated_by_operation_id
- invalidated_at
- created_at
```

Store domain payloads, not blind JSON diffs. For user-authored changes, storing both `before` and `after` is useful for audit and future undo/cherry-pick.

Example:

```json
{
  "eventType": "card.updated",
  "targetType": "card",
  "targetId": "card_123",
  "payload": {
    "before": {
      "title": "Captain Norman",
      "content": "Old text"
    },
    "after": {
      "title": "Captain Norman",
      "content": "Updated text"
    }
  }
}
```

## State Sequences

Every state-changing event gets a monotonic `state_sequence`.

Every turn stores the latest state sequence at the time the turn was created.

```text
Turn 1: state_sequence = 0
Turn 2: state_sequence = 2
Turn 3: state_sequence = 2
Turn 4: state_sequence = 5
```

Forking from Turn 3 reconstructs state using active events up to the turn's timeline/state boundary.

## Reconstruction Modes

Two modes are required.

### Historical Reconstruction

Answers: what literally existed at this timeline point originally?

Uses original timeline events, including records later hidden/deleted, unless the event itself had not occurred yet.

Useful for:

- audit
- debug
- future diff views

### Active Reconstruction

Answers: what should the current playable/editable state be at this point?

Ignores invalidated events and follows active projection rules.

Used for:

- gameplay
- normal fork creation
- prompt building

## Forking

Forks behave like lightweight Git forks, but each fork is a new visible adventure.

Fork metadata:

- `root_adventure_id`
- `parent_adventure_id`
- `forked_from_turn_id`
- `forked_from_timeline_sequence`
- `forked_from_state_sequence`
- `forked_from_state_hash`, optional
- fork timestamp

Fork algorithm:

1. User selects a turn.
2. Determine fork boundary from selected turn's timeline sequence.
3. Reconstruct active state at that boundary.
4. Create new Adventure with parent/root/fork metadata.
5. Copy active canonical turns up to the boundary.
6. Materialize reconstructed state as the new AdventureSnapshotBase.
7. Create `adventure.forked` event in the new adventure.
8. If requested, switch user to the new adventure.

Forks of forks work the same way.

## Future Sync And Diff

Initial implementation does not need sync/merge. It must preserve enough metadata for later.

Future tools may support:

- compare adventure with source scenario version
- compare adventure with latest scenario draft/version
- compare fork with parent adventure
- copy card/module edits from live adventure back to scenario
- cherry-pick changes between forks
- sync source scenario changes into adventure copies when non-conflicting

This applies to adventure copies/forks and scenarios, not complicated in-progress live branch merging.

## Turn Deletion

Turn deletion must be simple in the main UI.

Default behavior:

- Clicking delete deletes that turn and all later turns from the active story projection.

Alternate behavior:

- Holding Shift while clicking, or using the turn settings menu, deletes only that one turn.

Deletion is soft deletion:

- deleted turns remain in DB
- deleted turns can be restored
- deleted turns are excluded from prompt history
- deleted turns remain available for audit/debug

## Revert State Changes On Delete/Restore From Here

Deleting from a turn and restoring from a turn can optionally affect later state changes.

This should not be a separate primary action. It should be a checkbox/preference in the delete/restore flow or turn settings:

```text
Revert adventure state changes after this point
```

Applies to:

- delete from here
- restore from here/range operations

Does not apply to:

- delete one turn only

Behavior when enabled:

- later turns are soft-deleted/restored according to the operation
- later state events are marked invalidated/restored for active reconstruction as appropriate

Behavior when disabled:

- story projection changes, but manual adventure prompt/card/model edits remain active

Do not migrate state events to earlier turns. Preserve original timeline positions and mark active validity.

## Manual Events Vs Derived Events

Manual events:

- user edited card
- user edited module
- user changed model settings

These are timeline events and are not owned by a story turn.

Derived future events:

- memory extracted from turn
- script changed stat because of turn
- summary updated because of history

These should reference `source_turn_id` or operation provenance and can be invalidated/recomputed if story turns change.

## Retry Variants

Retry creates generation variants in a response group.

Rules:

- variants are archived, not deleted
- one variant is active/canonical
- user can switch variants before continuing
- retry can include guidance text
- retry can include selected previous variants as comparison
- continuing commits selected variant
- archived variants remain restorable if later turns are deleted back to that response group

If user goes back and selects a different archived variant, later active turns should be treated as stale and usually deleted from that point onward.

## Prompt Building Projection

Prompt builder uses:

- active reconstructed adventure state
- active canonical turns
- selected retry variant when relevant
- no deleted turns unless explicitly used for debug/restore UI

## Implementation Notes

Document reconstruction and deletion behavior carefully in code. This is a critical architectural seam for forks, restore, sync, scripts, memory, and future diff tools.
