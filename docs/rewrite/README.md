# ImaginAI Rewrite Documentation

This directory is the definitive rewrite planning stack for ImaginAI.

The older files under `docs/Plans/` are historical reference material only. They do not define the target architecture. The current rewrite is a full-stack redesign that preserves the existing product capabilities while replacing the backend, frontend, AI orchestration, and data model with an expandable architecture.

## Reading Order

1. `00_PRODUCT_VISION.md`
2. `01_DOMAIN_MODEL.md`
3. `02_PROVIDER_MODEL_CONFIGS.md`
4. `03_ROTATOR_GATEWAY.md`
5. `04_SCENARIO_SYSTEM.md`
6. `05_ADVENTURE_TIMELINE_STATE.md`
7. `06_AI_STORY_ENGINE.md`
8. `07_BACKEND_ARCHITECTURE.md`
9. `08_API_CONTRACTS.md`
10. `09_FRONTEND_LOGIC.md`
11. `10_AID_IMPORT_EXPORT.md`
12. `11_BUILD_PHASES.md`
13. `12_TESTING_STRATEGY.md`
14. `13_FRONTEND_DESIGN_HANDOFF.md`
15. `14_LEGACY_REFERENCE_MAP.md`
16. `15_AGENT_WALKTHROUGH.md`

Related library integration document:

- `../ROTATOR_LIBRARY_MULTI_USER_REQUIREMENTS.md`

## Core Locked Decisions

- ImaginAI supports self-host single-user alpha and future multi-user SaaS from the same architecture.
- Django remains the backend framework.
- Django Ninja is the preferred API framework.
- Use robust Django session auth plus CSRF for the web app from day one, with future token/JWT support possible.
- The frontend should be modern TypeScript, recommended stack React + Vite + TanStack Query + local UI store.
- Visual design will be handled by a separate design-focused model. These docs define logic, contracts, data flow, and constraints.
- `rotator_library` is the LLM communications layer, not the product router.
- ImaginAI owns users, permissions, provider connections, encrypted credentials, model configs, prompt/context logic, and story behavior.
- Provider setup and model config setup are separate concepts and separate UI flows.
- Scenario content is modular from day one.
- Scenario versions are immutable internally. Starting an adventure freezes the current scenario draft into a version if needed.
- Adventures are visible forkable units. Forks of forks are supported.
- Adventure state uses a clean append-only timeline and meaningful state events.
- No turn compression is used for context management. Old turns are cut off when budget runs out.
- Summary is rough always-injected long-term memory. Memory is precise selectively-injected detail. Both are future smaller-model systems.
- Retry creates archived variants. Continuing commits the selected variant while preserving archived alternatives.
- AID full scenario import is a core requirement.
- Future scripts/stats/images/memory/sync/diff must be supported by architecture seams, even when deferred.
- The old app is preserved under `legacy/` as reference material only. It should not be refactored in place into the new architecture.

## Implementation Notes

During implementation, major architectural seams should have comments or docstrings explaining their purpose and future expansion points. Avoid noisy comments on obvious code, but document hooks, event semantics, security boundaries, and state reconstruction rules clearly.

Implementation agents should add comments/docstrings for code that defines durable architecture, not for trivial line-by-line behavior. In particular, document:

- why a service or hook exists
- what future systems are expected to attach there
- what data must or must not be stored there
- how state/timeline/fork reconstruction is expected to work
- how secrets and provider credentials must be handled safely
- how memory, summary, scripts, stats, image generation, sync, and diff tools may use the seam later

This is especially important for extension points and long-lived contracts. Future maintainers should be able to understand the intended expansion path without reading the original planning conversation.

Implementation agents must also keep `15_AGENT_WALKTHROUGH.md` updated as a concise work diary. This is not user-facing documentation and should not become verbose. It should capture what was done, where it was done, important decisions, deviations from the plan, verification results, and known follow-ups so future agents can recover context after conversation compaction.

Large changes to `rotator_library` should not be made casually during ImaginAI implementation. Write a hard design document first, then let a library-focused agent implement the library change separately.
