# Frontend Design Handoff

## Purpose

This document tells a design-focused model what it owns and what it must not change.

The design model should create the visual and interaction design for the frontend. It should not redefine backend logic, domain rules, security rules, or API contracts.

## Product Feel

The app should feel like both:

- immersive game/storytelling surface
- powerful writer's studio

It is not a generic CRUD dashboard. The gameplay surface is the heart of the product.

## Design Model Owns

- visual language
- typography
- color system
- spacing
- component appearance
- responsive layouts
- interaction polish
- motion/transition style
- empty/loading/error states
- accessibility details
- information hierarchy
- how complex controls are revealed without clutter

## Design Model Must Not Change

- domain model
- API contracts
- auth/security rules
- provider/model scope rules
- retry variant semantics
- fork semantics
- turn deletion semantics
- memory/summary behavior
- adventure state reconstruction rules
- AID import/export mappings
- rotator integration boundary

## Screens To Design

### Auth

- login
- register/nickname alpha flow
- dev admin warning if applicable

### Dashboard

- recent adventures
- recent scenarios
- quick continue
- model/provider status
- create/import shortcuts

### Scenario Library

- list/search/filter scenarios
- scenario cards/list items
- create/import/duplicate/delete actions

### Scenario Editor

- modular prompt editor
- story cards editor
- default model selector
- import/export actions
- validation states
- future module extensibility
- future script/stat modules without designing the script language yet

### Adventure List For Scenario

- show all adventures/forks for a scenario
- original/fork visual distinction
- continue buttons
- archive/delete
- future tree/diff affordance without implementing it now

### Gameplay

Must support:

- readable story log
- streaming assistant output
- optional thinking display
- Do/Say/Story input
- Continue
- Retry with guidance
- variant switching
- fork from any turn
- edit/delete/restore turn actions
- model switcher
- adventure-local cards/modules/settings
- inspect/debug panel

Deletion UX:

- normal delete means delete from here
- Shift-click or turn menu means delete one turn only
- from-here delete/restore can include checkbox to revert state changes after point

### Provider Settings

- add/edit user provider connection
- provider/protocol type
- base URL
- API key input
- test/fetch models
- enabled state

### Model Settings

- create/edit model config
- provider connection picker
- model id picker/manual entry
- context slider
- visible response target
- temperature/top_p
- thinking settings
- extra params advanced section
- reorder/default/enabled

### Admin Settings

- global provider connections
- global model configs
- env-backed credential indication
- safe secret handling

### Import Flow

- AID preview
- mapping warnings
- cards/modules preview
- confirm/cancel

### Debug/Inspect

- prompt snapshot
- context layers
- activated cards
- summary/memory inclusion
- token usage
- provider metadata

## Design Requirements

- Desktop and mobile must both work.
- Gameplay reading/writing flow must be prioritized.
- Advanced controls should be accessible but not constantly overwhelming.
- Story, controls, side context, and debug should have clear hierarchy.
- Retry variants must be understandable.
- Fork/adventure copies should be visually understandable.
- Provider/model settings should be understandable to non-technical users while preserving advanced options.
- Global vs personal model distinction should be visible but not noisy.
- Secret fields should clearly communicate write-only behavior.

## Deliverables Expected From Design Model

- screen layout concepts
- component hierarchy
- responsive behavior
- design system tokens
- state designs: empty/loading/error/disabled/streaming
- accessibility considerations
- notes for implementing interaction polish

## Data And Actions Source Of Truth

Use these docs as source of truth:

- `08_API_CONTRACTS.md`
- `09_FRONTEND_LOGIC.md`
- `05_ADVENTURE_TIMELINE_STATE.md`
- `06_AI_STORY_ENGINE.md`
- `02_PROVIDER_MODEL_CONFIGS.md`

If a desired design requires backend behavior not listed there, flag it as a proposal instead of assuming it exists.
