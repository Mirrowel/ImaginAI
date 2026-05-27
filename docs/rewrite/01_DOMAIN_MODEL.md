# Domain Model

This document defines the main product objects and their relationships. It is conceptual, not a final migration file. Names may be adapted to Django conventions during implementation, but the concepts should remain intact.

## Identity

### User

Represents an account in both self-host alpha and future multi-user mode.

Fields/concepts:

- `id`
- `email`
- `display_name`
- `password_hash`
- `role`: `admin` or `user`
- `is_active`
- `created_at`
- `updated_at`

Alpha behavior:

- Login uses nickname/password.
- Nickname is both primary identity and display name during alpha.
- The DB can still include `email` from day one; alpha may store the nickname in the login/email field until real email auth is enabled.
- Later, real email/password and OAuth replace nickname-as-login while `display_name` remains user-facing.

Security rule:

- Email, display name, and normal profile fields are not encrypted.
- Secrets like API keys and OAuth tokens are encrypted.

## Provider And Model System

### ProviderConnection

A configured provider endpoint. Provider connections are configured once and can back many model configs.

Fields/concepts:

- `id`
- `owner_type`: `platform` or `user`
- `owner_user_id`, nullable for platform/global connections
- `name`
- `provider_type`: `openai`, `anthropic`, `gemini`, `openrouter`, `custom`, etc.
- `protocol`: `openai_chat_completions`, `openai_responses`, `anthropic_messages`, `gemini`, `litellm_native`, etc.
- `base_url`, nullable
- `is_enabled`
- `created_at`
- `updated_at`

Rules:

- User-owned provider connections are private.
- Platform/global provider connections are managed by admins.
- Custom providers require base URL and protocol type.
- A provider connection does not contain scenario prompts.

### ProviderCredential

Secret material for a provider connection.

Fields/concepts:

- `id`
- `provider_connection_id`
- `owner_type`: `platform` or `user`
- `owner_user_id`, nullable for platform/global credentials
- `auth_type`: `api_key`, `oauth`, future values
- `encrypted_secret`
- `display_name`
- `is_enabled`
- `created_at`
- `updated_at`

Rules:

- Secret field is encrypted in DB.
- API responses never expose the raw secret.
- Normal responses may show `has_credential`, display name, enabled state, and timestamps.
- Admins/hosts may inspect/decrypt secrets in self-host/admin context for now, but production design should treat these as secrets that should not be casually visible.

### ModelConfig

A selectable model configuration. Models are reusable technical generation configs, not scenarios.

Fields/concepts:

- `id`
- `owner_type`: `platform` or `user`
- `owner_user_id`, nullable for platform/global configs
- `provider_connection_id`
- `display_name`
- `model_id`
- `context_window`
- `user_context_limit_default`
- `visible_response_target_tokens`
- `provider_safety_max_tokens`, optional broad ceiling only
- `temperature`
- `top_p`
- `frequency_penalty`, optional
- `presence_penalty`, optional
- `thinking_enabled`
- `thinking_budget`, optional
- `show_thinking_default`
- `stream_thinking_default`
- `extra_parameters`, JSON
- `additional_system_prompt`, optional advanced override
- `sort_order`
- `is_default`
- `is_enabled`
- `created_at`
- `updated_at`

Rules:

- Global/platform model configs can be used by permitted users without exposing credentials.
- User model configs use only that user's credentials.
- Model configs may have optional additional system prompt, but scenario/adventure prompts remain separate and primary.
- `max_tokens` style provider params are safety ceilings only. Visible story length is controlled by ImaginAI prompt/stream/post-processing.

## Scenario System

### Scenario

Root identity for a reusable story template.

Fields/concepts:

- `id`
- `owner_user_id`
- `title`
- `description`
- `visibility`: `private`, `unlisted`, `public`
- `tags`
- `default_model_config_id`, nullable
- `draft_state`, implementation detail if drafts are stored separately
- `created_at`
- `updated_at`

### ScenarioVersion

Immutable frozen version of a scenario.

Fields/concepts:

- `id`
- `scenario_id`
- `version_number`
- `title`
- `change_note`
- `created_by_id`
- `created_at`

Rules:

- Scenario versions are immutable.
- Adventures always start from a specific scenario version.
- Starting an adventure freezes the current draft into a version automatically if needed.
- The UI can remain simple even though internal versioning exists.

### ScenarioModule

Modular scenario content.

Initial module types:

- `instructions`
- `plot_essentials`
- `authors_notes`
- `opening_scene`
- `player_description`

Future module types:

- `rules`
- `stats`
- `scripts`
- `image_style`
- `lorebook`
- `objectives`
- `random_tables`

Fields/concepts:

- `id`
- `scenario_version_id` or draft parent
- `module_type`
- `title`
- `content`
- `settings`, JSON
- `sort_order`
- `is_enabled`

### StoryCard

Reusable contextual card attached to a scenario version or adventure state.

Fields/concepts:

- `id`
- `scenario_version_id` or adventure state identity
- `title`
- `card_type`: `character`, `location`, `item`, `faction`, `concept`, custom string
- `summary`
- `content`
- `trigger_words`
- `use_for_character_creation`
- `activation_mode`: `always`, `triggered`, `manual`, `disabled`
- `priority`
- `token_budget`, optional
- `metadata`, JSON
- `is_enabled`
- `sort_order`

AID mapping:

- AID `title` -> `title`
- AID `type` -> `card_type`
- AID `description` -> `summary`
- AID `value` -> `content`
- AID `keys` -> `trigger_words`
- AID `useForCharacterCreation` -> `use_for_character_creation`

## Adventure System

### Adventure

Visible playable/forkable unit. Forks are also adventures.

Fields/concepts:

- `id`
- `owner_user_id`
- `scenario_id`
- `scenario_version_id`
- `root_adventure_id`, nullable for original/root
- `parent_adventure_id`, nullable
- `forked_from_turn_id`, nullable
- `forked_from_timeline_sequence`, nullable
- `forked_from_state_sequence`, nullable
- `forked_from_state_hash`, optional for future diff/sync
- `title`
- `status`: `active`, `archived`, `deleted`
- `current_model_config_id`, nullable
- `created_at`
- `updated_at`
- `last_played_at`

Rules:

- Forking creates a new adventure.
- Forks of forks are supported.
- Ancestry is preserved for future tree/diff/sync/cherry-pick tools.

### AdventureSnapshotBase

Initial materialized copied state for an adventure or fork.

Contains:

- scenario title/description/tags at creation
- copied scenario modules
- copied story cards
- starting model config/settings
- opening scene
- import metadata
- snapshot schema version

Rules:

- Adventure/fork state becomes independent from source scenario and parent adventure after creation.
- Future diff/sync uses ancestry and event metadata, not live object sharing.

### AdventureTimelineEntry

Conceptual append-only timeline position. Implementation may store timeline fields directly on turns and state events instead of using a separate table.

Purpose:

- give turns and state changes stable ordering
- support fork reconstruction
- support deletion/restoration without corrupting history
- support future audit/diff/sync

### AdventureStateEvent

Meaningful domain event that changes adventure data.

Fields/concepts:

- `id`
- `adventure_id`
- `state_sequence`
- `timeline_sequence`
- `effective_from_timeline_sequence`
- `event_type`
- `target_type`
- `target_id`, nullable
- `payload`, JSON
- `created_by_id`
- `source_turn_id`, nullable for derived/future script or memory events
- `is_invalidated`
- `invalidated_by_operation_id`, nullable
- `invalidated_at`, nullable
- `created_at`

Rules:

- Only meaningful adventure data changes create events.
- UI state and temporary drafts do not create events.
- Manual prompt/card/model edits are timeline events, not owned by a story turn.
- Derived future events can reference source turns and be invalidated if the source story changes.

### AdventureTurn

Canonical or archived story turn.

Fields/concepts:

- `id`
- `adventure_id`
- `sequence`
- `timeline_sequence`
- `state_sequence`
- `role`: `user`, `assistant`, `system_note`
- `action_type`: `do`, `say`, `story`, `continue`, `retry`, nullable
- `content`
- `response_group_id`, nullable
- `active_variant_id`, nullable for assistant response groups
- `model_config_id`, nullable
- `prompt_snapshot_id`, nullable
- `token_usage_id`, nullable
- `created_at`
- `updated_at`
- `is_deleted`
- `deleted_at`, nullable

Rules:

- Turns are soft-deleted, not physically removed.
- Prompt building uses active canonical turns.
- Deleted turns remain available for restoration/audit.

### GenerationVariant

Archived or active assistant generation for a response group.

Fields/concepts:

- `id`
- `response_group_id`
- `adventure_id`
- `content`
- `retry_instruction`, nullable
- `included_variant_ids`, list/JSON
- `model_config_id`
- `prompt_snapshot_id`
- `token_usage_id`
- `is_active`
- `archived_at`, nullable
- `created_at`

Rules:

- Retry creates variants.
- User can switch variants before continuing.
- Continuing commits the selected variant as canonical.
- Archived variants are preserved and may become restorable if later turns are deleted back to that response group.

## Memory And Summary

### AdventureSummary

Rough, compact, long-term memory of what has happened since the start.

Fields/concepts:

- `id`
- `adventure_id`
- `content`
- `source_range_metadata`, optional
- `model_config_id`, nullable
- `created_at`
- `updated_at`

Rules:

- Summary does not compress or replace turns.
- Old turns are dropped from context when budget runs out.
- Summary complements history as rough always-injected long-term context.
- Automatic summary updates are future work handled by a smaller model.

### AdventureMemory

Precise dynamically generated or user-pinned detail.

Fields/concepts:

- `id`
- `adventure_id`
- `scope`: `global`, `character`, `location`, future values
- `title`
- `content`
- `source_turn_id`, nullable
- `confidence`, optional
- `is_pinned`
- `metadata`, JSON
- `created_at`
- `updated_at`

Rules:

- Memories are selectively injected when relevant.
- Memory extraction is future work handled by a smaller model.
- Memory behaves like dynamic story cards, but system-created.

## Prompt And Usage

### PromptSnapshot

Debug/audit record for a generation.

Fields/concepts:

- `id`
- `adventure_id`
- `turn_id` or `variant_id`
- `model_config_id`
- `generation_intent`
- `state_sequence`
- `context_limit`
- `estimated_tokens_by_layer`
- `included_modules`
- `activated_cards`
- `included_summary_ids`
- `included_memory_ids`
- `included_turn_range`
- `messages`, JSON
- `created_at`

### TokenUsage

App-level usage record.

Fields/concepts:

- `id`
- `user_id`
- `adventure_id`, nullable
- `model_config_id`
- `provider_connection_id`
- `prompt_snapshot_id`, nullable
- `prompt_tokens`
- `completion_tokens`
- `visible_output_tokens`, optional estimate
- `reasoning_tokens`
- `cached_tokens`
- `total_tokens`
- `estimated_cost`
- `provider`
- `model_id`
- `raw_metadata`, JSON
- `created_at`

ImaginAI stores its own usage rows even if `rotator_library` also tracks quota and credential-level usage.
