# Scenario System

## Purpose

Scenarios are reusable story templates. They are the author's workspace for defining a world, opening state, instructions, player-facing description, and cards. Adventures are created from frozen scenario versions and then diverge independently.

## Core Objects

### Scenario

The scenario root identity.

Responsibilities:

- ownership and visibility
- title/description/tags
- default model config
- draft editing state
- relationship to versions

Visibility values:

- `private`
- `unlisted`
- `public`

Public sharing can be added later. Initial alpha can treat all user scenarios as private while preserving the field.

### ScenarioVersion

Immutable frozen scenario content.

Rules:

- Scenario versions are immutable.
- Adventures always start from a specific scenario version.
- Starting an adventure freezes the current draft into a version automatically if needed.
- Imports create scenario drafts/versions with import metadata.
- Exports can target a version or current draft.

Why versioning exists:

- stable adventure ancestry
- future diff/sync/cherry-pick
- public sharing/publishing
- rollback/history
- reproducible import/export

### ScenarioModule

Modular content unit.

Initial modules:

- `instructions`: core AI behavior and scenario rules
- `plot_essentials`: world/plot facts that matter broadly
- `authors_notes`: style/tone/reminders
- `opening_scene`: first assistant text or initial narrative setup
- `player_description`: user-facing description shown before starting

Future modules:

- `rules`
- `stats`
- `scripts`
- `image_style`
- `objectives`
- `random_tables`
- `custom_lore`

Future scripts should use a real scripting language or safe embeddable runtime. Candidate languages include Python, JavaScript/TypeScript, and Lua. The language choice is deferred, but scenario/module architecture must not block hard logic such as stats, conditions, and event hooks.

Implementation guidance:

- Do not hardcode the editor as one giant form.
- Treat initial fields as modules even if UI looks simple.
- Module types should be extensible.
- Module settings should be JSON for future per-module options.

### StoryCard

Story cards are lore/context records.

Initial fields:

- title
- card type
- summary
- content
- trigger words/aliases
- activation mode
- priority
- enabled state
- sort order
- metadata

Activation modes:

- `always`: included whenever budget allows or as high-priority context
- `triggered`: included when trigger words/aliases appear
- `manual`: included when selected/pinned manually
- `disabled`: not included

## Draft And Version Flow

Recommended internal model:

```text
Scenario
  -> current draft modules/cards
  -> immutable ScenarioVersion records
```

User-facing UI can stay simple:

- Edit scenario
- Save draft
- Start adventure
- Import/export
- Duplicate

When starting an adventure:

1. Check whether current draft already corresponds to an immutable version.
2. If not, create a new ScenarioVersion from the current draft.
3. Create Adventure from that version.
4. Materialize AdventureSnapshotBase from the version.

This gives robust versioning without forcing users to think about version control.

## Scenario Duplication

Duplicating a scenario should copy:

- title with suffix or user-provided title
- description/tags/visibility defaulting to private
- draft modules
- draft story cards
- default model config reference if user can access it

It should not copy adventures.

## Adventure Independence

When an adventure starts, it receives a materialized snapshot:

- modules copied from scenario version
- cards copied from scenario version
- relevant scenario metadata
- opening scene
- default model setting

Later scenario edits do not mutate existing adventures.

Adventure-local edits create adventure state events, not scenario edits.

## Copying Back Later

Future diff/sync/cherry-pick tools should allow:

- compare adventure-local cards/modules to source scenario version
- copy a card edit back to scenario draft
- copy a module/prompt edit back to scenario draft
- compare fork to parent adventure
- sync non-conflicting source scenario changes into an adventure copy

Initial implementation only needs metadata and clean state events to enable this later.

## AID Compatibility

AID import/export is core.

Story card mapping:

- AID `title` -> `StoryCard.title`
- AID `type` -> `StoryCard.card_type`
- AID `description` -> `StoryCard.summary`
- AID `value` -> `StoryCard.content`
- AID `keys` -> `StoryCard.trigger_words`
- AID `useForCharacterCreation` -> `StoryCard.use_for_character_creation`

Full AID scenario import should map available scenario-level fields into modules and metadata where possible.

## Validation

Scenario validation should check:

- title is present
- required initial modules exist or are creatable
- story cards have title/content or meaningful fields
- trigger words are normalized
- default model config is accessible if set
- visibility changes are permitted

## Extensibility Notes

During implementation, document module type registration points. Future modules like scripts and stats should be addable without rewriting the scenario editor, API, and prompt builder.
