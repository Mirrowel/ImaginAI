# Frontend Logic

## Purpose

This document defines frontend structure, screens, data flow, state ownership, and interaction logic. It does not define final visual design.

A separate design-focused model should decide visual language, layout polish, component styling, responsiveness, and interaction feel using the contracts here.

## Recommended Stack

- React
- TypeScript
- Vite
- TanStack Query for server state
- TanStack Router or React Router
- Zustand or similar for local UI/gameplay state
- Headless/Radix-style primitives for accessible complex components
- Tailwind/design-system-compatible styling if design model chooses it

## State Categories

### Server State

Owned by backend and cached with TanStack Query:

- current user
- provider connections
- model configs
- scenarios
- scenario drafts/versions
- modules
- story cards
- adventures
- turns
- generation variants
- adventure state
- state events
- prompt snapshots
- token usage
- imports

### Local UI State

Owned by components/local store:

- open panels
- selected tabs
- draft text
- active retry variant selection before commit
- streaming buffer
- expanded debug sections
- modal/dialog state
- fork dialog state
- card editor draft
- scenario editor dirty state
- selected previous variants for retry guidance

### Persistent Local Preferences

Can be stored locally:

- sidebar size
- theme preference
- show thinking default
- stream thinking preference
- debug panels visible
- last selected model
- text streaming enabled
- editor layout preference

## Routes / App Areas

### Auth

Screens:

- login
- register alpha nickname/password

Requirements:

- robust session auth with CSRF
- show default admin warning in dev/self-host mode if relevant

### Dashboard

Entry point after login.

Should show:

- recent adventures
- recent scenarios
- quick continue
- model/provider status warnings
- import/create shortcuts

### Scenario Library

Requirements:

- list/search/filter scenarios
- create scenario
- duplicate scenario
- import scenario
- delete/archive scenario
- open scenario editor
- open scenario adventures list

### Scenario Editor

Requirements:

- modular editor, not one hardcoded form
- initial modules: instructions, plot essentials, author notes, opening scene, player description
- story cards section
- default model selection
- import/export
- validation
- save draft
- start adventure

Future-proofing:

- module types should be extensible
- scripts/stats/rules/image style should fit later

### Scenario Adventure List

This is the "all chats/adventures for this scenario" view.

Requirements:

- show root adventures and forks together
- show fork ancestry metadata lightly
- continue adventure
- delete/archive adventure
- create new adventure from scenario
- possibly show thumbnail/summary/last played/message count

Future additions:

- tree view
- compare with parent
- sync/cherry-pick tools

### Gameplay

Most important screen.

Requirements:

- active story log
- player/assistant distinction
- streaming assistant response
- optional thinking panel/stream
- action mode selector: Do/Say/Story
- textarea with submit shortcuts
- Continue button
- Retry button
- retry instruction input
- select previous variants to include in retry
- variant selector for multiple retries
- commit selected variant implicitly when next user turn is submitted
- fork button on turns
- edit/delete/restore turn actions
- inspect prompt/token/context action
- model switcher
- context/settings quick access
- adventure-local cards/modules editor

Deletion UI:

- default delete means delete this turn and all later turns
- Shift-click or turn settings menu deletes only this turn
- from-here delete/restore can include checkbox: revert adventure state changes after this point

### Provider Settings

User-owned provider connections.

Requirements:

- add/edit/delete provider connection
- provider/protocol type
- base URL
- API key/credential
- test connection
- fetch models
- enabled toggle

### Model Settings

User model configs.

Requirements:

- select provider connection
- select fetched model or manually enter model id
- display name
- context limit default
- visible response target
- temperature/top_p/etc.
- thinking settings
- extra params
- optional additional system prompt in advanced section
- reorder models
- set default
- enabled toggle

### Admin Settings

Admin/global controls.

Requirements:

- global provider connections
- global model configs
- env-backed platform credentials
- user management later
- diagnostics later

### Import Flow

Requirements:

- AID full scenario import
- preview parsed scenario/modules/cards
- show warnings and mapping issues
- confirm import
- native ImaginAI import/export

## Gameplay Retry Logic

When an assistant response has variants, UI should expose:

- variant tabs/list
- active variant preview
- retry again
- retry guidance text
- include/exclude previous variants as comparison
- continue with selected variant

When user submits next player turn:

- selected variant becomes canonical
- non-selected variants become archived
- archived variants remain recoverable if user later deletes back to that response group

## Fork UX

Every turn can expose Fork.

Fork dialog fields:

- fork name
- optional note
- fork and switch
- fork only

After fork:

- new adventure appears in scenario adventure list
- if fork and switch, navigate to gameplay for new adventure
- ancestry metadata preserved for future diff/sync

## Streaming UX

Frontend consumes events:

- `generation.status`
- `generation.thinking_delta`
- `generation.content_delta`
- `generation.token_update`
- `generation.variant_created`
- `generation.final`
- `generation.error`

Behavior:

- show status before model starts
- append visible content live
- optionally show thinking
- replace live buffer with final post-processed output
- handle error gracefully
- prevent conflicting submissions during active generation

## Debug / Inspect UX

Each generated turn should allow inspection:

- model used
- context limit
- token estimates by layer
- activated cards
- summary included
- memories included later
- active turn range included
- prompt snapshot
- token usage
- provider metadata

This can be hidden behind an Inspect/debug panel.

## Design Delegation Boundary

Frontend implementation should expose clean component/data/action boundaries. Visual design can be replaced or refined without changing domain logic.

The design model may decide:

- layout
- typography
- color
- spacing
- component visuals
- responsive behavior
- motion/polish

The design model must not change:

- domain model
- API contracts
- retry/fork/deletion semantics
- provider/model security rules
- memory/summary behavior
- state reconstruction rules
