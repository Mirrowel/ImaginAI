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

## 2026-05-28 - Hearth Dark Frontend Redesign

Context:
- User rejected the recently rewritten frontend as visually unacceptable and requested a design-led redo using frontend-designer subagents rather than primary-agent design judgment.
- Ran a multi-round design council with labelled proposals, cross-critiques, convergence votes, and a final frontend-designer arbiter. The primary agent stayed responsible for API/state/wiring guardrails.
- Final consensus was named Hearth Dark: warm charcoal/amber-gold interactive-fiction workspace, story-first gameplay, serif prose, sans UI chrome, no cyan AI dashboard aesthetic.

Changed:
- Added shared design-council artifacts under `.cache/design-council/` for proposals, peer reviews, final consensus, and implementation handoff. These are cache/workspace artifacts, not application source.
- Split the old `frontend/src/App.tsx` monolith into modular route shells, hooks, components, styles, and helpers under `frontend/src/components/`, `frontend/src/hooks/`, `frontend/src/shells/`, `frontend/src/styles/`, and `frontend/src/lib/`.
- Added `RequireAuth`, `BrowseShell`, `PlayShell`, and `AuthShell` route structure. Gameplay now renders in `PlayShell` as a peer route, without the browse navigation rail.
- Added Hearth Dark CSS tokens/base/shell/component style layers and font imports using Latin subsets for Source Serif 4, Geist, and Geist Mono.
- Added Radix and virtualization dependencies for tabs/dropdowns/context interactions and long story logs.
- Rebuilt gameplay structure around a virtualized `StoryLog`, memoized read-mode `TurnView`, visible Radix `...` menu, inline edit, inline delete/restore confirmation, and right overlay `ContextPanel` for fork/retry/inspect.
- Fixed gameplay wiring during review: per-turn edit/delete/restore mutations use the real turn id, retry uses the selected turn's real `responseGroupId`, and all broad `invalidateQueries()` calls were replaced with keyed invalidations.
- Added mobile context-panel bottom-sheet behavior with mobile-only scrim while preserving desktop no-scrim right overlay.
- Converted BrowseShell from wide text sidebar to 56px desktop icon rail, plus reduced mobile bottom navigation. Mobile utilities are routed through Settings; mobile logout remains available.
- Reworked ScenarioEditor into a Radix Tabs writer-studio layout with Metadata, Modules, Cards, and Versions tabs while preserving existing field coverage and payload shapes.
- Added `/settings` route as the local preferences and utility hub. Moved local preferences off the dashboard and linked Providers, Models, Import, and Admin from Settings.
- Moved adventure state, memory, summary, and state-event tooling out of the below-story flow and into the gameplay context panel's state mode, then split that tooling into State / Memory / Events Radix tabs.
- Added subtle assistant response variant tabs below generated assistant turns when multiple variants exist for a response group; guided retry comparison controls remain in the context panel.
- Added story-log auto-scroll behavior: when the user is near the bottom, new turns/streaming stay visible; when scrolled up, a Hearth Dark "New content below" jump affordance appears.
- Added reusable `SkeletonBlock`, `SkeletonList`, and `EmptyState` primitives and applied them to query-backed browse/settings/admin lists.
- Persisted the active ScenarioEditor tab in local `uiStore` so authors keep their place across route changes.
- Removed default `Admin` / `123` values from the login form. Seeded credentials remain documented in `RUNNING.md`, but the form starts empty.
- Updated `RUNNING.md` with the redesigned frontend navigation, `/settings`, focus-mode gameplay shell, and manual seeded-login note.
- Updated frontend tests where necessary for tabbed scenario editor interaction.
- Added `frontend/tsconfig.tsbuildinfo` to `.gitignore` and removed it from Git tracking so Vite/TypeScript builds do not create persistent source-control churn.
- Added missing `--space-5` token after final design QA found a mobile context-panel padding reference to an undefined spacing token.

Decisions:
- The final design was chosen by frontend-designer consensus/arbiter, not the primary agent. Primary-agent authority remained limited to logic, API contracts, query keys, auth, security, and verification.
- `api.ts`, `types.ts`, `streaming.ts`, backend endpoints, SSE event shapes, auth/CSRF flow, provider credential secrecy, and mutation payloads were treated as hard guardrails and left intact.
- Turns are intentionally prose blocks, not cards or chat bubbles. Edit/delete are inline; fork/retry/inspect go to the context panel.
- Desktop context panel is a fixed right overlay with no scrim and no story reflow. Mobile context panel becomes a bottom sheet with a subtle mobile-only scrim.
- Kept old persisted `sidebarSize` and `editorLayout` fields in `uiStore` for compatibility, but removed no-op controls from the dashboard after the redesign made them irrelevant.
- Font imports use Latin subset packages to keep CSS/build output reasonable while preserving the agreed typography.
- Variant selection now invalidates both the adventure query and the adventure's variant query prefix, so inline active variant tabs do not stay stale after selection.

Verification:
- `npm test` in `frontend/` passed: 24 tests.
- `npm run build` in `frontend/` passed.
- Scanned frontend source for unkeyed `invalidateQueries()` and full-page `location.assign()` regressions after review fixes.
- No backend tests were run for this redesign slice because changes were frontend/docs/dependency scoped.

Follow-ups:
- Replace remaining raw HTML controls (`select`, checkbox, `details`) with Radix primitives where it materially improves accessibility/consistency.
- Add mobile swipe-to-dismiss for the context-panel bottom sheet if desired; current bottom sheet uses close button and scrim tap.
- Add automated accessibility checks or manual screen-reader pass for the redesigned shells and Radix interactions.
- Add reusable error-state components with retry actions for failed queries/mutations.
- Add optional literary-mode preference to swap story prose to the UI font for users who prefer maximum readability/accessibility.
- Consider replacing text-glyph nav icons with a lightweight icon set if visual polish warrants the dependency.
- Consider nav rail expand-on-hover after the current 56px rail has been tested in normal use.

## 2026-05-28 - Root Run Guide

Context:
- User asked whether the rewrite is finished and requested a root-level guide for running both backend and frontend.
- User later clarified Python should use `uv` and asked whether `.env.backend` is used.

Changed:
- Added `RUNNING.md` at the repository root.
- Documented backend virtualenv setup, environment variables, migrations, development admin seed, default scenario loader, backend server command, frontend install/dev commands, real-provider setup, verification commands, and troubleshooting.
- Updated backend settings to automatically load root `.env.backend` without overriding real shell environment values.
- Updated `.env.example` and `RUNNING.md` to use `.env.backend` and `uv` commands.
- Updated `.env.example` and `RUNNING.md` to treat PostgreSQL as the primary rewrite database, matching `07_BACKEND_ARCHITECTURE.md`; SQLite is documented only as an explicit throwaway/test fallback.
- Added `psycopg[binary]` to backend requirements for PostgreSQL support.
- Added Redis environment compatibility: settings read `REDIS_URL` or `REDIS_HOST`/`REDIS_PORT`/`REDIS_DB` and configure Django cache through `django-redis` when present, while preserving locmem cache fallback because Redis-backed features are still future-worker/cache scope.
- Added `CORS_ALLOWED_ORIGINS` fallback for CSRF trusted origins to support the user's previous `.env.backend` shape.
- Made the Vite dev proxy read root `.env.backend` for `BACKEND_ORIGIN` or `BACKEND_HOST`/`BACKEND_PORT`, so Django can run on a non-8000 port without shell env vars.
- Updated `.env.example` and `RUNNING.md` with backend alternate-port instructions and matching frontend proxy setup.
- Updated `backend/manage.py` so `uv run python backend/manage.py runserver` reads `.env.backend` and uses `BACKEND_ORIGIN` or `BACKEND_HOST`/`BACKEND_PORT` as the default address when no explicit addrport is supplied.
- Hardened dev proxy/CSRF startup behavior: Vite now logs the selected `/api` proxy target and uses an explicit proxy object, `/api/csrf` explicitly sets the CSRF cookie, and the frontend API client fails loudly if CSRF bootstrap does not set a cookie.

Verification:
- Documentation-only change; guide was written from current verified commands and project scripts.

## 2026-05-28 - Final Moderate Gap Closure

Context:
- Post-fix audits reported no remaining critical gaps and a short list of moderate correctness/UI items.
- Closed the remaining items that were practical and alpha-relevant.

Changed:
- `ProviderCredential` ENV credentials now honor their stored `env_var_name`; `has_secret` now reflects whether the env credential actually resolves.
- `.gitignore` now ignores `.env.backend` to avoid committing local backend secrets.
- `TokenUsage.visible_output_tokens` now uses the local estimate of the final post-processed visible text instead of subtracting reasoning tokens from provider completion counts.
- Added backend tests for custom ENV credential resolution and updated visible-token assertions.
- Model edit UI now preserves/edits `extraParameters` JSON instead of dropping advanced provider params on save.
- Scenario adventure list and Dashboard recent adventures now use page state and load-more metadata.
- Adventure-local card editor now exposes the same important fields as scenario cards: type, summary, activation mode, priority, token budget, character-creation flag, enabled toggle, metadata JSON, triggers, and content.
- Added frontend tests for model `extraParameters` editing and adventure-local card field saving.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 47 tests.
- `npm test` in `frontend/` passed: 24 tests.
- `npm run build` in `frontend/` passed.

Known Non-Blockers:
- Frontend load-more currently advances pages rather than accumulating pages in every view; sufficient for alpha visibility and API coverage, but can be refined.
- Full visual design polish remains future work; current UI is functional and consistent with the dark alpha shell.

## 2026-05-28 - Final Audit Critical Fixes And Frontend Completion

Context:
- Ran fresh read-only backend/frontend audits after the broad implementation slices.
- Treated audit results as advisory and verified concrete findings against code/tests before changing files.

Changed:
- Backend settings now tolerate both canonical `DJANGO_DB_*` environment names and legacy `.env.backend` `DB_*`/`ALLOWED_HOSTS` names; `DJANGO_DEBUG=True` style values now parse correctly.
- Added documented admin endpoint `POST /api/admin/model-configs/{id}/set-default` and frontend admin model default action.
- `AdventureService.fork()` now invokes the documented `after_fork_created` hook.
- Generation now canonicalizes each response group's active variant before the next player action/continue prompt, so retry-selected content becomes the story history before continuing.
- Prompt snapshots are covered by a test proving decrypted provider secrets do not enter stored prompt messages.
- Added tests for delete-from-here without state reversion, thinking-delta normalization, disabled model/credential rejection, malformed AID card tolerance, admin global default model, and visible token accounting.
- Token usage now records `visible_output_tokens` as completion minus reasoning tokens when reasoning usage is reported.
- Gameplay now handles `generation.thinking_delta`, retains thinking text after final events until the next generation starts, and exposes per-request generation quick settings passed to generate/continue/retry APIs.
- Scenario card editor now exposes summary, activation mode, priority, token budget, character-creation flag, enabled toggle, and metadata JSON.
- Scenario module editor now exposes settings JSON.
- Scenario adventure list now supports starting a new adventure, continuing, archiving, deleting, status tags, and light fork ancestry.
- Gameplay adventure state panel now includes a collapsed state-event list and adventure-local card reorder controls.
- Frontend list API helpers now accept `page`/`limit`; Scenario Library has a simple load-more/page control.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 46 tests.
- `npm test` in `frontend/` passed: 20 tests.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Run one last focused audit after this slice to catch any remaining documented gaps.
- If high-volume pagination matters before alpha, change frontend load-more from page replacement to accumulated pages.

## 2026-05-28 - Delegated Frontend UX And Backend Spec Tests

Context:
- Used `frontend-designer` for a contained frontend UX completion slice and `general` for backend spec-test expansion, then independently reviewed and reran verification.
- Treated subagent output as implementation assistance, not architectural authority.

Changed:
- Scenario editor now exposes a default model selector backed by `defaultModelConfigId`.
- Scenario modules can be enabled/disabled from the editor, with disabled styling.
- Scenario library now supports client-side search/filter by title, description, or tag and displays simple pagination metadata.
- Import preview now shows warning details plus parsed module/card titles and tags rather than only counts.
- Dashboard local preferences now expose theme, sidebar size, show-thinking default, and editor layout; compact sidebar and split editor layout are applied in CSS.
- Frontend `Page<T>` type now includes optional pagination metadata fields.
- Added frontend tests for import preview details, scenario search, and compact sidebar preference.
- Added backend tests for card activation word boundaries, activation modes, card budget limiting, retry comparison context, export secret exclusion, global model credential hiding, and forking after card edit.

Review Fixes:
- Fixed scenario default model selector to use loaded scenario data correctly instead of initializing controlled state before async data arrived.
- Fixed scenario library pagination metadata to report filtered visible count.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 39 tests.
- `npm test` in `frontend/` passed: 8 tests.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Add more component tests for model/provider editing and gameplay stream buffer/variant selection.
- Continue final audit against rewrite docs for any remaining edge requirements.

## 2026-05-28 - Provider And Model Settings Completion

Context:
- Continued provider/model configuration work against `02_PROVIDER_MODEL_CONFIGS.md`, `08_API_CONTRACTS.md`, and `09_FRONTEND_LOGIC.md`.
- User reminded that `general` and `frontend-designer` subagents are available; future frontend UX changes should delegate appropriately.

Changed:
- Fixed backend model-list pagination for user/admin model config endpoints.
- Provider PATCH endpoints can now add/rotate a write-only API key by creating a new credential without exposing existing secrets.
- Added frontend API helpers for provider model discovery and user/admin model reorder endpoints.
- Provider rows now support inline metadata edits, write-only key rotation, connection testing, deletion, and model discovery.
- Model create forms now expose user context limit, visible response target, temperature, top-p, thinking flags/budget, additional system prompt, and extra provider parameters.
- Model rows now support inline editing for advanced fields and Up/Down reorder controls.
- Admin model/provider settings use the same richer controls for global resources.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 34 tests.
- `npm test` in `frontend/` passed: 5 tests.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Add frontend component tests for provider model discovery, model edit/reorder, and write-only credential rotation.
- Confirm provider model discovery against real credentials outside fake LLM mode.

## 2026-05-28 - True Gateway Stream Consumption

Context:
- Addressed the remaining high-priority streaming architecture gap without modifying `rotator_library` casually.
- The product service now owns prompt/state prep and final commit, while `RotatorGateway` remains the only provider-call boundary.

Changed:
- `GenerationService.generate_stream()` now has a real provider-stream path when fake LLM mode is disabled.
- Added synchronous-to-async stream bridge that creates and consumes the gateway async stream in the same event-loop thread, then passes chunks to Django's synchronous `StreamingHttpResponse` path via a queue.
- Stream chunks are normalized into product SSE events as they arrive, including content deltas, thinking deltas, token updates, and provider completion statuses.
- The stream path commits prompt snapshot, token usage, turn/variant, and response group only after the provider stream completes.
- Added stream path hook invocation through `on_stream_chunk`.
- Improved stream chunk normalization for `data: {...}` SSE strings and OpenAI/LiteLLM-style `choices[].delta.content` / reasoning chunks.
- Added backend test proving gateway chunks are emitted and the final streamed text is committed with provider stream usage metadata.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 34 tests.

Follow-ups:
- Exercise this path manually with a real provider credential once available; unit tests use a stubbed async stream.
- Add frontend component tests for streaming buffer replacement against the real event sequence.

## 2026-05-28 - State Restore And Usage Metadata Hardening

Context:
- Continued independently validated backend architecture work after user reminder that explore audits are advisory only.
- Focused on state/timeline correctness, adventure-level generation settings, provider usage preservation, and custom provider aliasing.

Changed:
- `ReconstructedState` now carries `generation_settings`, and `generation_settings.changed` state events reconstruct adventure-level generation overrides.
- Restore-from-here can optionally revalidate state events invalidated by the matching delete-from-here operation.
- `RotatorGateway.complete()` now returns `GatewayCompletion` for non-streaming results, preserving normalized response text, provider usage metadata, and safe raw metadata.
- `TokenUsage` rows now prefer provider usage values (`promptTokens`, `completionTokens`, `reasoningTokens`, `cachedTokens`, `totalTokens`) and fall back to local estimates only when provider usage is unavailable.
- Custom provider aliases now use `custom_<connection-slug>/<model>` instead of ambiguous `custom/<model>`.
- Adventure state API now returns reconstructed generation settings; the model-settings endpoint can record both `model.changed` and `generation_settings.changed` events.
- Frontend adventure state panel now edits adventure-local generation overrides and restore calls can request state-event revalidation.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 33 tests.
- `npm test` in `frontend/` passed: 5 tests.
- `npm run build` in `frontend/` passed.

Follow-ups:
- True provider streaming still needs a dedicated persistence flow so chunks can stream before final turn/usage commit.
- Add component tests for adventure-local generation settings and restore-state checkbox behavior.

## 2026-05-28 - Frontend P0 Gameplay Gaps

Context:
- User reminded that explore agents can be wrong and that architectural judgment should remain with the primary agent. Treated audit findings as advisory and validated changes against docs/code/tests.
- Addressed remaining high-value frontend gameplay gaps: dashboard recent adventures, guided retry variant inclusion, and adventure-local card editing.

Changed:
- Added frontend API helpers for listing user adventures and adventure-local card create/update/delete state-event endpoints.
- Dashboard now lists recent adventures and provides a Quick Continue action to the most recent adventure.
- Adventure state panel now includes adventure-local card creation, editing, and deletion in addition to module/model overrides.
- Retry variant list now previews variant content and lets users select previous variants to include as rejected/comparison context in guided retry.

Verification:
- `npm test` in `frontend/` passed: 5 tests.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Add component tests for recent adventure rendering, adventure-local card edits, and selected variant inclusion.
- Continue making independent architectural decisions rather than treating agent audit output as authoritative.

## 2026-05-28 - Stream Normalization And PostgreSQL Settings

Context:
- Closed backend architecture/testing gaps for PostgreSQL environment switching and stream chunk normalization seams.

Changed:
- Added PostgreSQL environment settings in `backend/config/settings.py` for `DJANGO_DB_USER`, `DJANGO_DB_PASSWORD`, `DJANGO_DB_HOST`, `DJANGO_DB_PORT`, and `DJANGO_DB_CONN_MAX_AGE` when `DJANGO_DB_ENGINE` contains `postgresql`.
- Documented those variables in `.env.example` while preserving SQLite as the local alpha default.
- Added `RotatorGateway.normalize_stream_chunk()` to normalize string/dict/OpenAI-like chunks into frontend generation event payloads.
- Added backend tests for stream chunk normalization.

Decisions:
- SQLite remains default for self-host alpha/dev ergonomics, but PostgreSQL can now be selected entirely through env vars.
- Chunk normalization is implemented as a gateway utility before full provider streaming is wired into the generation commit path.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 29 tests.

Follow-ups:
- Wire `normalize_stream_chunk()` into true rotator streaming once provider streaming persistence semantics are finalized.

## 2026-05-28 - Scenario Reorder UI

Context:
- Closed the documented gap for scenario module/card ordering controls without adding drag-and-drop complexity.

Changed:
- Added frontend API helpers for scenario module and story-card reorder endpoints.
- Added Up/Down controls to scenario module and story-card editors, backed by reorder endpoints and query invalidation.
- Added shared `moveId()` helper for simple adjacent reorder operations.

Verification:
- `npm test` in `frontend/` passed: 5 tests.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Replace Up/Down controls with drag-and-drop if the design pass calls for it.
- Add component tests that assert reorder helpers call the right APIs.

## 2026-05-28 - Fork And Prompt History Test Coverage

Context:
- Added more documented testing-strategy coverage around fork ancestry and prompt exclusion of deleted turns.

Changed:
- Added backend test proving forks of forks preserve original root adventure and immediate parent metadata.
- Added backend test proving soft-deleted turns are excluded from prompt history while active turns remain included.

Verification:
- `python -m pytest backend/tests` passed: 28 tests.

Follow-ups:
- Add remaining timeline tests for state event ordering/cache correctness and from-here deletion with/without state reversion across more complex event sequences.

## 2026-05-28 - API Pagination Envelope

Context:
- Addressed the API contract requirement that list endpoints use pagination from day one.

Changed:
- Expanded `common.api.page_response()` to include `page`, `limit`, and `hasMore` in addition to `items` and `total`, with a safety cap of 200 items per page.
- Added `page`/`limit` query parameters to major list endpoints for scenarios, scenario versions, draft/version modules/cards, provider connections, model configs, available model configs, admin provider/model lists, adventures, scenario adventures, state events, memories, turns, and variants.
- Added backend test coverage for scenario list pagination metadata and slicing.
- Fixed reorder endpoint signatures after pagination changes so static reorder routes can still return paginated envelopes.

Decisions:
- Pagination is currently applied after queryset serialization for implementation simplicity; this satisfies contracts and UI shape now, but high-volume production endpoints should push slicing down to querysets.

Verification:
- `python -m pytest backend/tests` passed: 26 tests.
- `python backend/manage.py check` passed.

Follow-ups:
- Move pagination slicing before serialization on large endpoints when performance profiling warrants it.
- Add frontend pagination controls for lists that can grow large.

## 2026-05-28 - Local UI Preference State

Context:
- Continued frontend state-management requirements from `09_FRONTEND_LOGIC.md`, which separates server state, local UI state, and persistent local preferences.

Changed:
- Added Zustand `persist` middleware to `frontend/src/uiStore.ts` with durable local preferences for theme, thinking visibility, stream thinking, debug panel defaults, text streaming, sidebar size, editor layout, selected model, and action mode.
- Added Dashboard local preference controls for text streaming, stream thinking, and debug panels.
- Gameplay now respects `textStreamingEnabled`, falling back to non-streaming generate/continue endpoints when disabled.
- Added `frontend/src/uiStore.test.ts` covering gameplay state plus persistent preference fields.

Decisions:
- Preferences remain local-browser state and are not synchronized to the backend, matching rewrite docs.
- Some persisted fields are infrastructure-first (`sidebarSize`, `editorLayout`, theme) and will be consumed by richer layouts later.

Verification:
- `npm test` in `frontend/` passed: 5 tests across 3 files.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Apply persisted theme/sidebar/editor-layout preferences to CSS/layout when the design pass begins.
- Add tests for non-streaming generation fallback selection.

## 2026-05-28 - Gameplay And Editor Detail UI

Context:
- Continued frontend parity after component test harness by addressing remaining documented gameplay/editor secondary actions.

Changed:
- Added frontend types/API helpers for prompt snapshots, token usage, card import/export, and fork `note`/`switchToFork` fields.
- Added story-card import/export controls to the scenario editor using the existing draft card import/export endpoints.
- Expanded turn controls with fork note, switch-to-fork navigation, delete mode (`from_here` vs `single`), and revert-later-state checkbox.
- Expanded Inspect panel to fetch/display token usage and full prompt snapshot messages in addition to context report summaries.

Decisions:
- Card import currently accepts JSON arrays in the editor details panel; the full scenario import flow handles file uploads.
- Prompt messages are visible only through explicit Inspect expansion because they may be large and are debug-oriented.

Verification:
- `npm test` in `frontend/` passed: 4 tests.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Add tests for these new UI controls.
- Add visual reorder controls for modules/cards and selected-variant include/exclude controls for guided retry.

## 2026-05-28 - Frontend Component Test Harness

Context:
- Added real frontend component test infrastructure after the audit showed only the SSE parser had coverage.

Changed:
- Installed Testing Library dependencies: `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, and `jsdom`.
- Configured Vitest jsdom environment in `frontend/vite.config.ts` and added `frontend/src/testSetup.ts`.
- Added `frontend/src/App.test.tsx` with authenticated route tests for provider settings secret redaction and native ImaginAI import preview behavior.
- Kept existing parser tests in `frontend/src/streaming.test.ts`.

Decisions:
- Tests mock `frontend/src/api.ts` at the route boundary so UI behavior is tested without a live Django server.
- Component tests use isolated QueryClient instances and explicit cleanup to avoid route state leaking between tests.

Verification:
- `npm test` in `frontend/` passed: 4 tests across 2 files.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Add component tests for scenario editor duplicate/freeze/export/delete, provider/model row actions, adventure state panel, streaming retry, and delete/fork UX.

## 2026-05-28 - Gateway And Hook Hardening

Context:
- Continued high-risk backend hardening from the rewrite audit after frontend parity work.

Changed:
- Added RotatorGateway normalized error taxonomy mapping for auth, rate-limit, quota, context-size, timeout, provider-unavailable, stream-interrupted, no-credential, and unknown provider failures.
- Added gateway secret redaction for key-like `sk-*` material in raised errors.
- Forwarded thinking-related generation settings (`thinkingEnabled`, `thinkingBudget`) to the rotator call seam alongside temperature/top-p/max-token settings.
- Invoked the `after_variant_selected` story-engine hook from the variant selection endpoint.
- Added backend tests for gateway error normalization/redaction, canonical turn replacement after variant selection, and generation lifecycle hook invocation.

Decisions:
- `HttpError` detail remains a string in the format `<type>: <message>` because the installed error class has a broken `__str__` behavior when given a dict. This still provides a stable machine-readable prefix without leaking secrets.
- True provider chunk streaming remains a larger RotatorGateway/rotator-library integration task; the current hardening improves the non-streaming and pseudo-streaming path without making casual library changes.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 25 tests.

Follow-ups:
- Add provider/rotator integration tests with a mocked streaming client once the gateway is split enough to normalize real chunks.
- Add frontend error handling that can parse the `<type>: <message>` gateway error prefix into user-facing guidance.

## 2026-05-28 - Frontend Contract Parity Slice

Context:
- Continued from frontend audit gaps after backend contract closure.
- Focused on wiring existing backend APIs into usable frontend flows without introducing a separate design-system refactor.

Changed:
- Expanded frontend type contracts for scenario versions, richer story card/model fields, prompt/token turn references, and native import/export support.
- Added frontend API helpers for scenario duplicate/delete/freeze/version list/export, module create/delete, card delete, native import preview/confirm, streaming retry, adventure-local module/model state edits, provider update/delete/test, model update/delete/default, and admin provider/model update/delete/test.
- Expanded scenario editor with duplicate, freeze version, export, delete, version list, module creation, module delete, and card delete actions.
- Added native ImaginAI import mode, JSON file upload, and mapped preview details to the import flow while retaining AID import.
- Added streaming retry from turn rows, shared generation event handling, and cross-mutation generation locking so Submit and Continue cannot run concurrently.
- Added adventure-local state panel for module overrides and model override edits backed by state-event APIs.
- Added provider row actions for enable/disable, test, and delete. Added model row actions for enable/disable, default, and delete, with admin-safe endpoint selection for platform resources.

Decisions:
- Kept frontend changes in the existing single-file shell for now to avoid a broad component architecture rewrite while behavior is still being filled in.
- Export downloads happen entirely client-side from the native scenario export payload; no provider/model/credential data is included in that path.
- Admin rows use admin-specific API helpers for platform resources; user settings rows use user-scoped helpers.

Verification:
- `npm run build` in `frontend/` passed.
- `npm test` in `frontend/` passed: 2 tests.

Follow-ups:
- Add React Testing Library and component tests for scenario editor actions, import file/native mode, provider/model action rows, adventure state panel, and streaming retry.
- Add UI for scenario/card/module drag reorder, card import/export, adventure-local card editing, prompt snapshot/token usage detail panes, fork note/switch options, and delete mode/revert checkbox.
- Consider splitting `App.tsx` into route/component modules before the next large frontend expansion to keep maintainability acceptable.

## 2026-05-28 - Backend Contract Gap Closure

Context:
- Ran explore audits against rewrite docs and current implementation. Backend gaps found included missing reorder endpoints, missing `untilTurnId` state reconstruction, retry-without-response-group semantics, disconnected story-engine hooks, incomplete SSE event coverage, and route-order risks.

Changed:
- Added `POST /api/model-configs/reorder` and `POST /api/admin/model-configs/reorder` for documented model picker ordering.
- Added `POST /api/adventures/{id}/state/modules/reorder` and sorted reconstructed modules/cards by `sortOrder`.
- Extended `GET /api/adventures/{id}/state` with `untilTurnId` support by resolving the turn's timeline boundary.
- Extended fork response handling for documented `note` and `switchToFork` body fields while preserving existing fork materialization behavior.
- Tightened retry generation so `intent == retry` requires an existing `responseGroupId` instead of silently creating a new response group.
- Wired `StoryEngineHooks` into the synchronous generation pipeline at state, context, prompt, model-call, response, and commit boundaries.
- Expanded SSE stream output with `queued`, `post_processing`, `saved`, `generation.token_update`, and `generation.variant_created` events.
- Made card activation enforce an aggregate card token budget and made response trimming more code-fence/dialogue/paragraph aware.
- Fixed route ordering so static `reorder` routes are registered before dynamic `{model_id}`/`{module_id}` routes.
- Added tests for model reorder, adventure module reorder plus historical `untilTurnId` reconstruction, retry response-group validation, and stream event contract coverage.

Decisions:
- Streaming still uses the synchronous generation commit path internally, but the event contract is now complete enough for frontend handlers and future true provider streaming.
- Hook calls are no-op by default and synchronous orchestration invokes them via the async bridge, preserving future attachment points without making Django ORM orchestration async.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 22 tests.

Follow-ups:
- Implement true provider chunk streaming and normalized RotatorGateway error taxonomy.
- Add more documented state/fork/variant tests: forks of forks, deleted-turn prompt exclusion, variant selection canonical turn updates, and context budget turn dropping.
- Continue frontend parity work for the newly closed backend contracts.

## 2026-05-28 - Admin Diagnostics And Usage Visibility

Context:
- Continued SaaS/self-host hardening by adding admin-facing diagnostics and usage visibility without exposing credentials.

Changed:
- Added admin diagnostics endpoint `GET /api/admin/diagnostics` with aggregate counts for users, scenarios, versions, cards, adventures, turns, state events, provider connections, model configs, and token usage rows.
- Added admin usage endpoint `GET /api/admin/usage` returning recent app-level token usage rows with user/model/provider references and no raw secrets.
- Added frontend admin diagnostics grid and recent usage list to the existing admin settings page.
- Added backend test asserting admin diagnostics/usage work and usage output does not include the configured fake provider secret.

Decisions:
- Admin usage is intentionally app-level `TokenUsage`, not rotator-library quota tracking; rotator diagnostics can be added behind this seam later.
- Diagnostics are count-based for now to support self-host troubleshooting without leaking content or credentials.

Verification:
- `python -m pytest backend/tests` passed: 19 tests.
- `npm run build` in `frontend/` passed.
- `npm test` in `frontend/` passed: 2 tests.
- `python backend/manage.py check` passed.

Follow-ups:
- Add date filtering and provider/model aggregation for usage once the UX requires it.
- Add rotator-library health/quota diagnostics only after a dedicated library design document, per rewrite instructions.

## 2026-05-28 - Memory And Summary API Seams

Context:
- Implemented Phase 11-style memory/summary seams so future smaller-model workers can attach without changing gameplay prompt contracts.

Changed:
- Added adventure summary endpoints: `GET/PATCH /api/adventures/{id}/summary`.
- Added adventure memory endpoints: `GET/POST/PATCH/DELETE /api/adventures/{id}/memories` and `/memories/{memory_id}`.
- Summary and memory changes record meaningful `AdventureStateEvent` rows for audit/future invalidation semantics.
- Added frontend API helpers and a gameplay `Memory And Summary` panel for manual summary updates and pinned memory creation/listing.
- Added backend test proving manual summary and pinned memory IDs appear in generated context reports.

Decisions:
- Summary remains rough always-injected context and does not replace or compress turns.
- Memories are precise details; pinned memories are injected by prompt builder now, while automatic extraction remains a future worker concern.

Verification:
- `python -m pytest backend/tests` passed: 18 tests.
- `npm run build` in `frontend/` passed.
- `npm test` in `frontend/` passed: 2 tests.
- `python backend/manage.py check` passed.

Follow-ups:
- Add restore/invalidation behavior for derived future memory events when source turns are deleted.
- Add richer memory editing UI and filtering by scope when memory volume grows.

## 2026-05-28 - Native Import And Frontend Test Harness

Context:
- Continued hardening after gameplay and security slices to cover remaining testing strategy items.

Changed:
- Added `frontend/src/streaming.ts` with a documented `parseSseFrames()` helper for POST SSE stream parsing.
- Added `frontend/src/streaming.test.ts` covering complete and split generation stream frames.
- Updated `frontend/src/api.ts` to use the shared parser instead of inline stream parsing.
- Added backend native export/import round-trip coverage via `/api/scenarios/{id}/export`, `/api/imports/imaginai/preview`, and `/api/imports/imaginai/confirm`.

Decisions:
- Kept frontend streaming parser as a pure utility so it can be tested without browser rendering or a live backend.
- Native export test asserts provider/secret terms are absent from exported scenario JSON, keeping provider credentials out of import/export paths.

Verification:
- `python -m pytest backend/tests` passed: 17 tests.
- `npm test` in `frontend/` passed: 2 tests.
- `npm run build` in `frontend/` passed.
- `python backend/manage.py check` passed.

Follow-ups:
- Add richer React component/integration tests with Testing Library once test dependencies are introduced.
- Add usage/admin diagnostics UI and more detailed prompt snapshot/token usage panels.
- Add adventure-local reorder UI for cards/modules and more robust restore behavior around variants.

## 2026-05-27 - Security And Import Hardening

Context:
- Continued closing rewrite-doc requirements after the gameplay completion slice.
- Focused on provider/model isolation, admin boundaries, and real AID sample compatibility.

Changed:
- Updated `AIDImportService` to support AID exports that are a raw list of story cards, not only object-wrapped scenario payloads.
- Added backend tests covering the real `AID/scenario-cmh4bSuZOc_g-story-cards-34.json` fixture, normal-user rejection from admin provider endpoints, user model config rejection when backed by a platform provider, and denial of cross-user personal model config resolution.

Decisions:
- Raw list AID imports become a scenario titled `Imported AID Story Cards` with the cards mapped into native `StoryCard` draft fields. This preserves migration utility even when an export has no scenario-level prompt fields.
- Scope isolation remains enforced at service level, not only API/controller level, so future callers share the same safety guarantees.

Verification:
- `python -m pytest backend/tests` passed: 16 tests.
- `python backend/manage.py check` passed.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Add native ImaginAI export/import round-trip tests.
- Add frontend unit/component tests now that build coverage is stable.
- Add richer admin diagnostics/usage screens and debug panels.

## 2026-05-27 - Gameplay Completion Slice

Context:
- User asked to continue until everything in the rewrite docs is done, with best effort, extensive tests, walkthrough updates, and docstrings/comments.
- This slice focused on closing gameplay/editor/admin gaps left by the first vertical slice.

Changed:
- Added scenario draft module/card reorder endpoints and draft card import/export endpoints in `backend/scenarios/api.py`.
- Added adventure-local card reorder endpoint and variant listing endpoint in `backend/adventures/api.py`.
- Fixed `GenerationService` orchestration so synchronous Django ORM work stays outside async context; only the RotatorGateway call is async-wrapped. This was caught by API generation tests.
- Added backend tests for fake LLM generation, prompt/token/context inspection, retry variant creation/listing, and AID import preview/confirm mapping.
- Expanded frontend API client with streaming POST parsing, scenario module/card update/create helpers, retry/list/select variant helpers, context report fetch, and admin provider/model helpers.
- Expanded gameplay UI with streaming buffer/status, retry guidance, variant selector, inspect/context report panel, fork, turn edit, delete-from-here, and restore actions.
- Expanded scenario editor UI from read-only modules/cards to editable module text, editable story cards, and card creation.
- Added admin settings route for global provider connections and global model configs, visible only for admin users in the nav.

Decisions:
- Keep story orchestration synchronous for now because Django ORM is synchronous in this codebase; async remains isolated at provider communication seams.
- Frontend streaming uses `fetch()` readable streams because generation endpoints are POST SSE-style streams, not simple `EventSource` GET streams.
- Retry variants are listed by response group via `/api/adventures/{id}/variants?responseGroupId=...`; selecting a variant updates the canonical assistant turn when one exists.

Verification:
- `python backend/manage.py check` passed.
- `python -m pytest backend/tests` passed: 12 tests.
- `npm run build` in `frontend/` passed.

Follow-ups:
- Add frontend component tests for streaming, retry variant selection, scenario card/module editing, and admin forms.
- Add backend ownership/security tests for provider/model admin vs user scopes and cross-user denial.
- Add real AID sample import tests from `AID/` and native round-trip tests.
- Add adventure-local module/card reorder UI and debug prompt snapshot/token usage detail panels beyond context summary.

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
