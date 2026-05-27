# Build Phases

The rewrite should be built in vertical slices with durable foundations. Avoid recreating a throwaway prototype.

## Phase 0: Repo And Architecture Setup

Goal: clean replacement structure.

Work:

- keep old implementation isolated under `legacy/` for reference
- set backend app structure
- set frontend app structure
- configure Django Ninja
- configure tests/lint/formatting
- configure environment handling
- establish implementation comment/docstring standards for architectural seams and future extension points
- establish and continuously maintain `docs/rewrite/15_AGENT_WALKTHROUGH.md` as the agent work diary
- add backend health endpoint
- add frontend shell calling backend
- remove assumptions around committed secrets

Deliverable:

- runnable empty app shell
- backend and frontend communicate
- test runner works

## Phase 1: Auth And Users

Goal: real login from the beginning.

Work:

- custom user model
- session auth + CSRF
- nickname/password alpha login
- role field
- default dev admin seed command
- `GET /api/auth/me`
- ownership helpers

Deliverable:

- users can log in/out
- admin role exists
- future data can be user-owned

## Phase 2: Provider Connections And Model Configs

Goal: model/key architecture before story generation.

Work:

- ProviderConnection
- ProviderCredential with encrypted secret
- ModelConfig
- user provider/model APIs
- admin global provider/model APIs
- env-backed platform credential support
- RotatorGateway with classifier-scoped library calls
- model discovery path

Deliverable:

- admins create global models
- users create personal providers/models
- gameplay can request available model configs
- secrets are write-only

## Phase 3: Scenario System

Goal: preserve and improve scenario functionality.

Work:

- Scenario
- ScenarioVersion
- ScenarioModule
- StoryCard
- scenario CRUD
- scenario duplicate
- module/card editor APIs
- native import/export
- AID full scenario import preview/confirm

Deliverable:

- users create/edit/import/export scenarios
- initial modules match current functionality
- cards are AID-compatible

## Phase 4: Adventure Creation And State Events

Goal: playable adventure data model before AI.

Work:

- Adventure
- AdventureSnapshotBase
- AdventureStateEvent
- AdventureTurn
- append-only timeline fields
- start adventure from scenario version
- reconstruct adventure state
- adventure-local module/card edits produce events
- adventure list per scenario

Deliverable:

- user can start adventure
- adventure has independent snapshot
- state reconstruction works

## Phase 5: Forking And Turn Deletion

Goal: Git-like forks and robust story editing.

Work:

- fork adventure from any turn
- forks of forks
- preserve ancestry metadata
- reconstruct state at fork point
- materialize fork snapshot
- soft-delete turns
- default delete from here
- single-turn deletion via Shift/menu
- optional revert state changes after point for from-here delete/restore
- restore basics

Deliverable:

- fork from old turn uses correct old active state
- forks appear as adventures
- turn deletion behaves predictably

## Phase 6: Story Generation MVP

Goal: first end-to-end AI gameplay.

Work:

- GenerationService
- PromptBuilder
- ContextBudgetService
- CardActivationService
- ResponsePostProcessor
- PromptSnapshot
- TokenUsage
- Do/Say/Story
- Continue
- RotatorGateway calls only
- context limit slider
- visible response target
- sentence/paragraph cutoff

Deliverable:

- user can play adventure with AI
- cards trigger
- old turns are dropped when context budget fills
- no turn compression

## Phase 7: Streaming

Goal: modern interactive gameplay.

Work:

- SSE endpoint
- stream status/thinking/content/final/error events
- frontend streaming buffer
- optional thinking display
- final post-processed replacement

Deliverable:

- AI response streams into gameplay
- user sees generation phases

## Phase 8: Retry Variants

Goal: high-quality guided retry.

Work:

- response groups
- generation variants
- retry instruction
- include previous variants as comparison
- variant switching
- selected variant becomes canonical on continue
- archive alternatives

Deliverable:

- user can retry repeatedly
- user can guide retry
- user can choose best variant
- archived variants can be restored when going back

## Phase 9: Frontend Functional Flows

Goal: complete functional frontend before visual polish.

Work:

- route map
- auth screens
- dashboard
- scenario library
- scenario editor
- adventure list per scenario
- gameplay logic
- provider settings
- model settings
- admin settings
- import flow
- inspect/debug panels

Deliverable:

- all main flows work
- design model can polish visuals without changing logic

## Phase 10: Design Pass

Goal: design-focused model creates polished UI.

Work:

- layout concepts
- responsive design
- design system tokens
- components
- empty/loading/error states
- accessibility pass

Deliverable:

- polished immersive game + writer studio UI

## Phase 11: Memory And Summary Hooks

Goal: prepare long-term intelligence.

Work:

- memory/summary tables if not already present
- hook interfaces
- manual/placeholder summary injection
- selected memory injection path
- no automatic extraction required yet

Deliverable:

- pipeline can support future smaller-model memory/summary workers

## Phase 12: Hardening

Goal: stable self-host alpha and future SaaS foundation.

Work:

- error handling
- prompt/token inspection
- import validation
- admin diagnostics
- usage stats
- secret redaction tests
- backup/export
- performance pass
- mobile pass
- test pass

Deliverable:

- stable alpha foundation
