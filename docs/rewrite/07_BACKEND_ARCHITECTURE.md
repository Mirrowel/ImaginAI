# Backend Architecture

## Stack

Use Django as the backend foundation.

Recommended stack:

- Django
- Django Ninja for typed APIs
- PostgreSQL as primary DB
- Django session auth plus CSRF for browser app
- ASGI for streaming/SSE
- Redis later for cache/background coordination
- Celery/RQ/Django-Q later for workers
- `rotator_library` through `RotatorGateway` only

## Django Apps

Suggested app structure:

```text
accounts
ai_providers
scenarios
adventures
story_engine
imports
admin_tools
common
```

### accounts

- custom user model
- auth/session endpoints
- roles/permissions
- dev admin seed command
- future OAuth/email support

### ai_providers

- provider connections
- encrypted credentials
- model configs
- global/user model visibility
- model discovery cache if used
- RotatorGateway adapter support

### scenarios

- scenarios
- scenario drafts/versions
- modules
- story cards
- scenario duplicate/import/export mapping

### adventures

- adventures/forks
- snapshot bases
- timeline/state events
- turns
- response groups/generation variants
- prompt snapshots
- token usage

### story_engine

- generation orchestration
- prompt builder
- context budgeting
- card activation
- response post-processing
- hooks

### imports

- AID import preview/confirm
- native import/export
- validation and mapping warnings

### admin_tools

- global model/provider management helpers
- diagnostics
- future feature flags

### common

- base models
- timestamps
- encryption helpers
- API errors
- pagination
- permissions helpers
- audit utilities

## Layering

Do not place business logic in API controllers.

Use:

```text
API route/controller
  -> service
    -> query/repository helper where useful
      -> ORM
```

Important services:

- `AuthService`
- `ProviderConnectionService`
- `ProviderCredentialService`
- `ModelConfigService`
- `ScenarioService`
- `ScenarioVersionService`
- `StoryCardService`
- `AdventureService`
- `AdventureStateService`
- `ForkService`
- `TurnService`
- `GenerationService`
- `PromptBuilder`
- `ContextBudgetService`
- `CardActivationService`
- `ResponsePostProcessor`
- `RotatorGateway`
- `AIDImportService`

## Auth

Use robust auth from day one:

- custom Django user model
- session auth for browser app
- CSRF protection
- role field or permissions for admin/user
- future token/JWT support possible

Alpha login:

- nickname/password
- nickname stored as login/display identity initially
- default dev admin `Admin / 123` only in dev/self-host seed path
- strong warning to change/remove dev admin for production

## Secrets

Only secrets are encrypted:

- API keys
- OAuth tokens
- provider credentials
- future recovery/provider secrets

Do not encrypt normal application data like:

- email/login identifier
- display name
- scenario text
- adventure text
- public metadata

## Streaming

Use ASGI-compatible streaming endpoints.

SSE is preferred for generation events. The backend can expose either:

- POST endpoint returning `text/event-stream`, if frontend supports it cleanly
- or job creation plus event stream endpoint

Alpha can use the simpler path if reliable.

## Background Jobs

Do not require workers for initial generation. Design for workers later.

Future jobs:

- memory extraction
- summary updates
- AID import processing for large files
- model list refresh
- usage sync/aggregation
- cleanup archived variants
- cache warmup

## Permissions

Rules:

- users access their own scenarios/adventures/provider connections/model configs
- users access enabled global model configs without seeing secrets
- admins manage global provider/model configs
- public/unlisted scenario sharing later must not expose private adventures
- forked adventure belongs to the user who created the fork
- user-owned model config never uses another user's credential
- user-owned model config never falls back to platform credential

## Caching

Correctness must not depend on Redis.

Good cache candidates later:

- reconstructed adventure state by `(adventure_id, state_sequence)`
- provider model discovery results
- scenario/adventure list summaries
- token estimates/context reports

Cache keys for state:

```text
adventure:{id}:state:{state_sequence}
adventure:{id}:state-at:{timeline_sequence}:{mode}
```

## Comments And Docstrings

Implementation should document architectural seams:

- state reconstruction
- timeline semantics
- hook interfaces
- RotatorGateway security boundary
- secret handling
- retry variant canonicalization
- context budgeting
- AID mapping

Avoid noisy comments on obvious code.
