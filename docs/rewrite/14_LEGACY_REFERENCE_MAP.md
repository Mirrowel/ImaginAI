# Legacy Reference Map

## Purpose

The old implementation has been moved under `legacy/` so the rewrite can be built cleanly without losing useful reference material.

The legacy code is not the target architecture. It should be consulted for behavior, field names, import samples, and isolated logic ideas. It should not be copied wholesale or refactored in place.

## Current Legacy Layout

```text
legacy/
  backend_old/      old Django backend prototype
  frontend_old/     old root-level Vite/vanilla TypeScript frontend
  old_archive/      pre-existing old/ archive from the original repo
  README_OLD.md     old project README
  API_DOCUMENTATION_OLD.md
  api_test_old.py

lib/                active rotator_library dependency and proxy reference
AID/                AID import sample files
docs/Plans/         historical plans only
docs/rewrite/       definitive rewrite documentation
```

## What To Reference

### Old Backend

Path:

```text
legacy/backend_old/
```

Useful references:

- `legacy/backend_old/api/models.py`
- `legacy/backend_old/api/serializers.py`
- `legacy/backend_old/api/views.py`
- `legacy/backend_old/api/urls.py`
- `legacy/backend_old/api/default_scenario.json`
- `legacy/backend_old/api/management/commands/load_default_scenario.py`
- `legacy/backend_old/imaginai_backend/config.py`
- `legacy/API_DOCUMENTATION_OLD.md`
- `legacy/api_test_old.py`

Reference for:

- old Card/Scenario/Adventure/AdventureTurn field inventory
- current default scenario seed
- existing scenario/adventure REST action list
- old AI generation behavior
- old token usage/stat tracking ideas
- old sentence cutoff/truncation concept
- current import/export behavior
- old API documentation and smoke-test expectations

Do not copy:

- monolithic `views.py` architecture
- direct Gemini SDK usage
- singleton `GlobalSettings` model as final design
- old all-cards-in-prompt behavior
- old token/history handling without context budgeting
- hardcoded secrets/settings patterns
- old no-auth/no-ownership assumptions

### Old Frontend

Path:

```text
legacy/frontend_old/
```

Useful references:

- `legacy/frontend_old/src/types.ts`
- `legacy/frontend_old/src/apiService.ts`
- `legacy/frontend_old/src/geminiService.ts`
- `legacy/frontend_old/src/state.ts`
- `legacy/frontend_old/src/ui/gameplay/*`
- `legacy/frontend_old/src/ui/scenarioEditor/*`
- `legacy/frontend_old/src/eventHandlers/*`
- `legacy/frontend_old/index.html`
- `legacy/frontend_old/Pics/`
- `legacy/README_OLD.md`

Reference for:

- current TypeScript domain shape
- old API call inventory
- gameplay controls: Do/Say/Story, Continue, Retry, Inspect
- old token stats modal concept
- scenario editor fields and card editor flow
- adventure-local card/settings edit behavior
- old README feature descriptions and screenshots/images

Do not copy:

- vanilla `innerHTML` rendering architecture
- global mutable frontend state as final design
- manual event listener reattachment patterns
- monolithic CSS from `index.html`
- direct old assumptions about endpoint shapes
- old inconsistent direct `fetch()` calls outside API service

### rotator_library

Path:

```text
lib/rotator_library/
```

This is an active dependency, not legacy. ImaginAI should call it only through `RotatorGateway`.

Reference for:

- scoped classifier calls
- streaming/non-streaming completion behavior
- model discovery
- usage/quota/cooldown mechanics
- provider abstractions

Important related docs:

- `docs/ROTATOR_LIBRARY_MULTI_USER_REQUIREMENTS.md`
- `docs/CLASSIFIER_SCOPED_ROUTING_WALKTHROUGH.md`, if present

Large library changes require their own hard design document before a library-focused implementation agent works on them.

### Proxy App

Path:

```text
lib/proxy_app/
```

The proxy is reference-only for ImaginAI.

Reference for:

- examples of calling `RotatingClient`
- streaming response wrapping ideas
- model list/quota endpoint ideas

Do not depend on:

- proxy HTTP routing
- proxy auth model
- proxy startup lifecycle
- proxy UI/tools

### AID Samples

Path:

```text
AID/
```

Use for:

- real AID story card import tests
- full scenario import mapping tests
- edge cases in card fields and key formats

Do not mutate sample files unless intentionally adding fixtures.

### Historical Plans

Path:

```text
docs/Plans/
```

These are historical/old plans only. They may contain useful context, but they are not authoritative. The authoritative rewrite docs are under `docs/rewrite/`.

## Behavior To Preserve From Legacy

- scenario CRUD
- scenario duplicate
- scenario import/export
- card CRUD
- card import/export
- AID compatibility, expanded to full scenario import
- adventure start from scenario
- adventure list
- adventure-local prompt/card edits
- Do/Say/Story actions
- Continue
- Retry, replaced by guided retry variants
- turn edit/delete, expanded with robust timeline semantics
- token/prompt inspection
- default seed scenario concept

## Behavior Intentionally Replaced

- direct Gemini SDK calls become `RotatorGateway` -> `rotator_library`
- all-cards prompt injection becomes trigger/manual/always card activation
- unbounded history becomes context-budgeted recent turn selection
- old local/global settings become user/global `ModelConfig` records
- old singleton settings become user/admin scoped settings
- old adventure duplicate becomes full fork-from-turn adventures
- old retry replacement becomes archived generation variants
- old vanilla frontend becomes modern React/TypeScript frontend
- old monolithic backend views become service-layer Django apps

## Implementation Guidance

When implementing a new feature, use this order:

1. Read the relevant `docs/rewrite/` spec.
2. Check this reference map for useful legacy files.
3. Extract behavior or test cases, not architecture.
4. Build the new feature in the rewrite structure.
5. Add tests for the preserved or intentionally changed behavior.

If legacy behavior conflicts with `docs/rewrite/`, the rewrite docs win.
