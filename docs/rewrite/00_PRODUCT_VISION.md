# Product Vision

## Identity

ImaginAI is an interactive AI storytelling sandbox. It combines an immersive text adventure interface with a writer's studio for building reusable worlds, characters, lore, rules, and future scripted logic.

The product should feel like a sandbox with an LLM at its center. Users can make anything that works through text first, with images and richer media later.

## Product Modes

ImaginAI must support two deployment modes from the same architecture:

- **Self-host alpha mode:** primarily one user, the project owner/developer, but still using real login, admin controls, and durable models.
- **Multi-user platform mode:** future SaaS/community mode with many users, user-owned model configs, admin/global model configs, permissions, and public/unlisted/private content.

The alpha can be operationally single-user, but the codebase must not be architected as a single-user toy. Data ownership, permissions, model scopes, and admin controls must exist from the start.

## Product Pillars

Priority order for the build is:

1. solo storytelling experience
2. scenario/card authoring and sharing foundations
3. provider/model controls for power users
4. multi-user platform foundations

All four must be represented in the architecture from the start, even though the gameplay loop is the first product priority.

### 1. Best-in-class solo storytelling

The most important experience is playing an adventure:

- fast, immersive story log
- streaming AI responses
- Do/Say/Story actions
- Continue
- guided Retry with selectable variants
- fork from any point
- edit/delete turns
- modify adventure-local cards and prompts
- switch models and generation settings
- inspect what context was used

### 2. Writer's studio scenario authoring

Users need strong tools to create and maintain scenario templates:

- modular scenario sections
- story cards/lorebook entries
- AID import/export
- native import/export
- scenario versioning
- future scripts, stats, rules, objectives, random tables, image style, and other modules

### 3. Provider-agnostic AI platform

Users and admins can configure provider connections and model configs. ImaginAI should support platform/global models and user-owned personal models.

Users should be able to switch models easily without knowing the internals of provider routing. Admins can configure global models that appear to users without exposing the underlying keys.

### 4. Expansion-first architecture

The rewrite must be easy to extend. Future systems should plug in rather than require a rewrite:

- memory extraction
- rough adventure summary
- scripts using a real language, exact choice TBD: Python, JavaScript/TypeScript, Lua, or another safe embeddable option
- stats and hard logic that can enforce rules instead of relying only on soft LLM behavior
- image generation
- diff/sync/cherry-pick between adventures and scenarios
- public scenario sharing
- OAuth/email verification
- quotas/billing if SaaS

## Preserved Current Functionality

The rewrite must preserve the useful functionality of the current prototype:

- scenario CRUD
- scenario duplicate
- scenario import/export
- story card CRUD
- AID card compatibility, expanded to full scenario import
- adventure start from scenario
- adventure list
- adventure duplicate/fork concept
- Do/Say/Story actions
- Continue AI
- Retry AI
- turn edit/delete
- adventure-local prompt/card edits
- model/global settings
- token/prompt inspection

## Non-Goals For Initial Build

The architecture should support these, but the first implementation does not need full versions:

- automatic memory extraction
- full RAG memory
- script runtime
- stats engine
- image generation
- visual adventure tree
- sync/merge/cherry-pick UI
- public marketplace
- billing

## Guiding Principle

The old app was CRUD plus an LLM call. The rewrite should be a story engine first: context, memory, cards, state, variants, forks, and models are core product concepts, not incidental helpers.
