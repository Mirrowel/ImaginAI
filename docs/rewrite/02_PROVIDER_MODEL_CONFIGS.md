# Provider And Model Configuration

## Principle

Provider connections, credentials, and model configs are separate.

Users configure a provider once, then create one or more model configs that use that provider. Admins can create global provider/model configs that appear to users without exposing secrets.

## Provider Connections

A provider connection represents an endpoint and protocol.

Examples:

- OpenRouter account
- OpenAI account
- Gemini API account
- custom OpenAI-compatible local server
- future Anthropic-native endpoint

Fields/concepts:

- name
- provider type
- protocol type
- base URL if needed
- owner scope: platform or user
- enabled state

Provider connection UI fields:

- display name
- provider/protocol selector
- base URL
- API key/credential input
- test connection button
- fetch models button
- enabled toggle

## Credentials

Credentials are secrets for provider connections.

Rules:

- Stored encrypted in DB.
- Write-only in normal API responses.
- Decrypted only at call/test/model-discovery time.
- Never stored in prompt snapshots or logs.
- Admin/global env-backed credentials are supported.

For self-host alpha, the host/admin may inspect secrets if needed. Production behavior should still treat them as secrets that should not be casually visible.

## Model Configs

A model config is what the user selects during gameplay.

It contains:

- display name
- provider connection
- model id
- context metadata
- user context limit default
- visible response target tokens
- temperature/top_p/etc.
- thinking/reasoning settings
- extra provider parameters
- optional additional system prompt
- ordering/default/enabled flags

It does not contain scenario instructions by default.

## Global Models

Global/platform models are created by admins.

Rules:

- Users can select them if permitted.
- Users cannot see underlying secrets.
- They use platform/global credential pools.
- They may be backed by credentials entered in admin UI or by `.env`/platform credentials.
- Usage can be tracked at both library credential level and ImaginAI user/model level.

## User Models

User models are private model configs created by a user.

Rules:

- They use only that user's provider connection and credential.
- They never fall back to platform credentials.
- Other users cannot see or use them.
- They appear in the user's model picker alongside permitted global models.

## Model Picker

The gameplay model picker should show a merged list:

- user-owned enabled models
- permitted global enabled models

Each entry should show safe metadata:

- display name
- provider/model label
- context window or configured context
- global/personal badge
- enabled/default status

Users should be able to reorder their model list. Reordering affects user UI preference, not global model definition.

## Context And Generation Settings

Each model config has true/known model context metadata and user-facing defaults.

Important distinction:

- `model_context_window`: estimated/provider/model maximum
- `user_context_limit`: slider-controlled effective budget for gameplay
- `visible_response_target_tokens`: desired visible story length
- `provider_safety_max_tokens`: optional broad ceiling for provider call

Visible response length is not controlled primarily by provider `max_tokens`. Some providers count reasoning against it, making it unreliable. ImaginAI controls visible response length through prompt instructions, streaming monitoring, and response post-processing.

## Thinking/Reasoning Settings

Model configs may include:

- `thinking_enabled`
- `thinking_budget`
- `show_thinking_default`
- `stream_thinking_default`

Reasoning tokens are separate from visible story length when provider metadata makes that possible.

## Custom Providers

Custom providers require:

- name
- base URL
- protocol type
- API key/credential if needed
- model id discovery or manual entry

Initial custom provider support can focus on OpenAI-compatible chat completions, while leaving protocol fields ready for Anthropic-native, OpenAI responses, Gemini-native, and other formats.

## Admin Env-Backed Models

Admins can create global model configs without entering a key in the UI if the key is available from environment/platform configuration.

Example:

```text
.env contains OPENROUTER_API_KEY
Admin creates global ProviderConnection: OpenRouter env-backed
Admin creates global ModelConfig: Claude via OpenRouter
Users select the model
RotatorGateway sends platform-scoped credentials to rotator_library
```

## Validation Rules

- Model config owner scope must match provider connection owner scope unless explicitly using a global provider.
- User-owned model config must not reference another user's provider connection.
- User-owned model config must not use platform credentials.
- Global model config must not use user credentials.
- Disabled provider/model/credential cannot be selected for generation.
- Secret values are never returned by read endpoints.
