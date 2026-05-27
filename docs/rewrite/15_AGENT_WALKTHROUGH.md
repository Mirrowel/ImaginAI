# Agent Walkthrough

## Purpose

This file is an agent-facing work diary for the ImaginAI rewrite. It exists so future agents can recover implementation context after conversation compaction or handoff without reading every prior message.

Keep it detailed enough to understand what changed and why, but concise enough to avoid wasting tokens. This is not marketing documentation and not a replacement for the formal design docs.

## Update Rules

Update this file whenever an agent:

- creates, moves, deletes, or significantly edits files
- makes or changes an architectural decision
- intentionally deviates from `docs/rewrite/`
- discovers an important constraint in legacy code or `rotator_library`
- adds tests or changes verification strategy
- leaves known follow-ups, blockers, or risks

Do not record every trivial command. Record durable context.

## Entry Format

Use newest entries first.

```text
## YYYY-MM-DD - Short Title

Context:
- Why this work happened.

Changed:
- Important files/directories changed.
- Important behavior or architecture changed.

Decisions:
- Decisions made and rationale.

Verification:
- Tests/checks run, or why not run.

Follow-ups:
- Known next steps, risks, or open questions.
```

## 2026-05-27 - Backend/Frontend Vertical Slice

Context:
- Continued the rewrite implementation after the initial scaffold, following the user's instruction to proceed methodically, keep the diary current, and add docstrings/comments for functions and architectural seams.
- User also asked not to compact context prematurely; no conversation compression was performed despite environment reminders.

Changed:
- Retrofitted docstrings into the first-pass backend functions/classes in `common`, `accounts`, `ai_providers`, `scenarios`, and `adventures`.
- Added `story_engine` services: no-op hook seam, `CardActivationService`, `ContextBudgetService`, `PromptBuilder`, `ResponsePostProcessor`, `RotatorGateway`, `GenerationService`, SSE event serialization, and fake LLM mode support via `IMAGINAI_FAKE_LLM`.
- Added `adventures/api.py` with adventure list/start/get/update/archive/delete, scenario adventure lists, fork, state reconstruction/events, adventure-local module/card/model state edits, turn list/edit/delete/restore, generation/continue/retry, SSE generation endpoints, variant selection, prompt snapshot, token usage, and context report endpoints.
- Added `imports` app with AID preview/confirm and native preview/confirm services/APIs. AID mapping supports scenario fields plus `title/type/description/value/keys/useForCharacterCreation` story-card fields and warnings.
- Added `admin_tools` health route and root `config/urls.py` Ninja API wiring under `/api/`.
- Added provider test/model-discovery endpoints for user and admin provider connections, using `rotator_library` through a safe helper and never returning credential values.
- Generated initial migrations for `accounts`, `ai_providers`, `scenarios`, and `adventures`; applied migrations to local SQLite.
- Added `scenarios` management command `load_default_scenario` to import the legacy Neon Static default scenario into the rewrite module/card model.
- Added backend tests in `backend/tests/test_rewrite_core.py` covering encrypted credentials, scenario freeze reuse, adventure snapshot/opening turn, fork boundary state reconstruction, delete-from-here state invalidation, triggered card activation, post-processing, and context budget limits.
- Added React/Vite frontend under `frontend/` with typed API client, Zustand UI store, TanStack Query, React Router routes, auth page, dashboard, scenario library/editor, scenario adventure list, gameplay, provider settings, model settings, import flow, and responsive CSS.
- Updated `.env.example` for rewrite backend/provider/fake-LLM settings and updated root `README.md` with backend/frontend run commands.
- Added explicit `common.middleware.ApiCsrfMiddleware` plus `/api/csrf` token bootstrap because installed `django-ninja` does not support the older `csrf=True` constructor option. The frontend API client now fetches a CSRF cookie before unsafe requests.
- Corrected JSON body handling on Ninja endpoints by explicitly annotating request payloads with `Body(...)`; plain `payload: dict` was interpreted as a query parameter by the installed Ninja version and returned `422` for JSON posts.

Decisions:
- Installed `django-ninja`/`pytest-django` from `backend/requirements.txt` and React frontend dependencies via `npm install` to verify the new stack.
- Removed the unsupported `csrf=True` constructor argument from the installed `django-ninja` version and replaced it with explicit API CSRF middleware so session-auth browser writes still require CSRF.
- Treat `Body(...)` annotations as required for all future JSON endpoints to avoid framework-version ambiguity.
- Implemented streaming endpoints as app-level SSE wrappers around the committed generation flow for now; future work can normalize live rotator stream chunks directly.
- Frontend currently uses non-streaming generation fallback for the composer to keep the functional shell stable; stream consumption UI remains a follow-up.
- `RotatorGateway` uses current classifier/private credential support in `rotator_library` without large library changes.

Verification:
- `python -m compileall backend` passed.
- `python backend/manage.py check` passed.
- `python backend/manage.py makemigrations accounts ai_providers scenarios adventures` generated initial migrations.
- `python backend/manage.py migrate --noinput` applied migrations successfully.
- `python -m pytest backend/tests` passed: 10 tests, including CSRF bootstrap/login and authenticated JSON scenario creation through Ninja `Body(...)` parsing.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Add frontend tests for auth, scenario editor/import basics, provider/model secret handling, gameplay submit, retry variant selection, and fork dialog behavior.
- Expand frontend to consume `generate-stream`/`continue-stream`/`retry-stream` events with streaming buffer/final replacement.
- Add deeper backend API tests for ownership boundaries, admin-only endpoints, model config scope isolation, import edge cases using real `AID/` samples, generation with mocked gateway, prompt snapshots, and secret redaction.
- Add more API-level integration tests for adventure/provider/model writes now that JSON body parsing and CSRF bootstrap are covered for login and scenario creation.
- Improve card/module editing UI beyond read-only draft display and add reorder endpoints/UI.
- Add hardening around async execution, production PostgreSQL settings, and direct rotator streaming normalization.

## 2026-05-27 - Rewrite Implementation Scaffold Started

Context:
- User requested execution of the full rewrite from `docs/rewrite/`, using legacy only as reference, with methodical implementation and an always-current agent diary.
- User explicitly reinforced best effort, careful implementation, diary updates before compaction/destructive context work, and docstrings/comments for functions and architectural seams.

Changed:
- Added a new `backend/` Django project scaffold with `config`, `common`, `accounts`, `ai_providers`, `scenarios`, `adventures`, `story_engine`, `imports`, and `admin_tools` app structure beginning to replace the preserved legacy app.
- Added Django settings using session/CSRF auth, custom user model, local SQLite default, `lib/` path integration for `rotator_library`, and environment credential placeholders.
- Added `accounts` custom `User`, `AuthService`, Ninja auth routes, and `seed_dev_admin` management command for alpha `Admin / 123` seeding.
- Added provider/model data layer: `ProviderConnection`, `ProviderCredential`, `ModelConfig`, secret encryption helpers, safe credential DTOs, user/admin provider and model APIs, and scope validation services.
- Added scenario data layer and services: mutable `Scenario` drafts, immutable `ScenarioVersion`, modular `ScenarioModule`, `StoryCard`, version-freezing by stable draft hash, scenario duplicate, draft module/card APIs, and native scenario export skeleton.
- Added adventure data models/services: `Adventure`, `AdventureSnapshotBase`, append-only `AdventureStateEvent`, `AdventureTurn`, `ResponseGroup`, `GenerationVariant`, `PromptSnapshot`, `TokenUsage`, `AdventureSummary`, `AdventureMemory`, adventure start from scenario version, state reconstruction, fork materialization, and soft-delete/restore service seams.

Decisions:
- New implementation is greenfield in `backend/` and will not refactor or mutate `legacy/`.
- Provider credentials are separate from provider connections and raw secrets are accepted only on write/decrypt-at-call paths.
- Scenario versions are immutable by convention and created from draft hashes so starting an adventure can auto-freeze without forcing users into version-control UI.
- Adventure forks materialize their own snapshot from reconstructed active parent state, avoiding live sharing with parent history.
- Existing code added before the user's docstring reminder must be retrofitted with docstrings/comments as part of the next implementation pass.

Verification:
- Not yet run. Backend is mid-scaffold and still needs routers, migrations, story engine/generation, imports, frontend, tests, and docstring retrofit before meaningful verification.

Follow-ups:
- Add `story_engine` services, `adventures` API, `imports` API, root Ninja router/URLs, and migrations.
- Add docstrings to all existing functions/methods and keep adding them for new code.
- Add tests for auth, provider secrecy, scenario freeze/import, adventure state/fork/delete, card activation, context budgeting, and generation with mocked/fake gateway.
- Scaffold frontend React/Vite flows after backend APIs are coherent.

## 2026-05-27 - Rewrite Documentation And Legacy Boundary

Context:
- The project is being rewritten as a modern interactive AI storytelling platform while preserving useful behavior from the old prototype.
- The old `docs/Plans/` files are historical only; `docs/rewrite/` is authoritative.

Changed:
- Created the definitive rewrite documentation stack under `docs/rewrite/`.
- Created `docs/ROTATOR_LIBRARY_MULTI_USER_REQUIREMENTS.md` for library multi-user/provider requirements.
- Moved the old Django backend to `legacy/backend_old/`.
- Moved the old vanilla TypeScript/Vite frontend to `legacy/frontend_old/`.
- Moved old root references to `legacy/README_OLD.md`, `legacy/API_DOCUMENTATION_OLD.md`, `legacy/api_test_old.py`, and `legacy/old_archive/`.
- Added a new root `README.md` that points to `docs/rewrite/` and the legacy reference map.
- Added `docs/rewrite/14_LEGACY_REFERENCE_MAP.md` to explain what legacy code can be referenced and what must not be copied.

Decisions:
- Rewrite will be greenfield inside the same repo, not an in-place refactor of the old app.
- Old implementation remains as reference material only.
- `lib/rotator_library/` remains an active dependency; `lib/proxy_app/` is reference-only.
- Future implementation agents must document architectural seams with comments/docstrings and keep this walkthrough updated.

Verification:
- Verified root directory now contains `legacy/`, `docs/`, `lib/`, `AID/`, and a rewrite-focused `README.md`.
- Verified `legacy/backend_old/` and `legacy/frontend_old/` exist with old code.
- Verified rewrite docs include coverage for auth, provider/model configs, RotatorGateway, scenario versioning, adventure timeline/forks/deletion, retry variants, memory/summary, AI engine, backend/API/frontend, AID import, build phases, testing, design handoff, and legacy references.

Follow-ups:
- Scaffold the new backend and frontend in clean directories when implementation begins.
- Use `docs/rewrite/14_LEGACY_REFERENCE_MAP.md` before consulting legacy code.
- Keep this walkthrough updated during every substantial implementation step.
