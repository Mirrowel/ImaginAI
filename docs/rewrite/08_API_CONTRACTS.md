# API Contracts

This document defines the intended API surface. Exact route names may adapt to Django Ninja conventions, but the domain capabilities should remain.

## API Principles

- Use typed request/response schemas.
- Use explicit action endpoints for domain actions like fork, retry, import, and generate.
- Return frontend-ready DTOs where useful.
- Do not expose raw secrets.
- Use pagination for lists from day one.
- Enforce ownership and permissions at service level.
- Keep debug/prompt/token endpoints permission-gated.

## Auth

```text
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me
```

Alpha register/login uses nickname/password. Future email/OAuth can be added without changing the rest of the app model.

## Provider Connections

User endpoints:

```text
GET    /api/provider-connections
POST   /api/provider-connections
GET    /api/provider-connections/{id}
PATCH  /api/provider-connections/{id}
DELETE /api/provider-connections/{id}
POST   /api/provider-connections/{id}/test
GET    /api/provider-connections/{id}/models
```

Admin/global endpoints:

```text
GET    /api/admin/provider-connections
POST   /api/admin/provider-connections
PATCH  /api/admin/provider-connections/{id}
DELETE /api/admin/provider-connections/{id}
POST   /api/admin/provider-connections/{id}/test
GET    /api/admin/provider-connections/{id}/models
```

Response must show safe credential metadata only, such as `hasCredential`, never raw secrets.

Provider credentials are first-class secret records even if the UI presents them inside provider setup.

```text
POST   /api/provider-connections/{id}/credentials
PATCH  /api/provider-connections/{id}/credentials/{credential_id}
DELETE /api/provider-connections/{id}/credentials/{credential_id}
```

Admin/global credential endpoints follow the admin provider path:

```text
POST   /api/admin/provider-connections/{id}/credentials
PATCH  /api/admin/provider-connections/{id}/credentials/{credential_id}
DELETE /api/admin/provider-connections/{id}/credentials/{credential_id}
```

Credential writes accept secrets. Credential reads return safe metadata only.

## Model Configs

User model configs:

```text
GET    /api/model-configs
POST   /api/model-configs
GET    /api/model-configs/{id}
PATCH  /api/model-configs/{id}
DELETE /api/model-configs/{id}
POST   /api/model-configs/reorder
POST   /api/model-configs/{id}/set-default
```

Admin/global model configs:

```text
GET    /api/admin/model-configs
POST   /api/admin/model-configs
PATCH  /api/admin/model-configs/{id}
DELETE /api/admin/model-configs/{id}
POST   /api/admin/model-configs/reorder
```

Gameplay model picker:

```text
GET /api/available-model-configs
```

Returns merged safe list of user-owned enabled models and permitted global enabled models.

## Scenarios

```text
GET    /api/scenarios
POST   /api/scenarios
GET    /api/scenarios/{id}
PATCH  /api/scenarios/{id}
DELETE /api/scenarios/{id}
POST   /api/scenarios/{id}/duplicate
POST   /api/scenarios/{id}/freeze-version
GET    /api/scenarios/{id}/versions
GET    /api/scenarios/{id}/versions/{version_id}
```

`freeze-version` creates an immutable version from the current draft. Starting an adventure can call equivalent service behavior automatically.

## Scenario Modules

Draft modules:

```text
GET    /api/scenarios/{id}/draft/modules
POST   /api/scenarios/{id}/draft/modules
PATCH  /api/scenario-modules/{id}
DELETE /api/scenario-modules/{id}
POST   /api/scenarios/{id}/draft/modules/reorder
```

Version modules are read-only:

```text
GET /api/scenarios/{id}/versions/{version_id}/modules
```

## Story Cards

Draft cards:

```text
GET    /api/scenarios/{id}/draft/cards
POST   /api/scenarios/{id}/draft/cards
PATCH  /api/story-cards/{id}
DELETE /api/story-cards/{id}
POST   /api/scenarios/{id}/draft/cards/reorder
POST   /api/scenarios/{id}/draft/cards/import
GET    /api/scenarios/{id}/draft/cards/export
```

Version cards are read-only:

```text
GET /api/scenarios/{id}/versions/{version_id}/cards
```

## Adventures

```text
GET    /api/adventures
POST   /api/adventures/start
GET    /api/adventures/{id}
PATCH  /api/adventures/{id}
DELETE /api/adventures/{id}
POST   /api/adventures/{id}/archive
```

Scenario-specific adventure list:

```text
GET /api/scenarios/{id}/adventures
```

Shows originals and forks for the scenario.

## Forking

```text
POST /api/adventures/{id}/fork
```

Body:

```json
{
  "fromTurnId": "turn_123",
  "title": "Fork name",
  "note": "optional",
  "switchToFork": true
}
```

Returns the new adventure.

## Adventure State

```text
GET /api/adventures/{id}/state
GET /api/adventures/{id}/state?untilTurnId=...
GET /api/adventures/{id}/state?timelineSequence=...&mode=active|historical
GET /api/adventures/{id}/state-events
```

Adventure-local modules/cards create `AdventureStateEvent` records:

```text
PATCH  /api/adventures/{id}/state/modules/{module_id}
POST   /api/adventures/{id}/state/cards
PATCH  /api/adventures/{id}/state/cards/{card_id}
DELETE /api/adventures/{id}/state/cards/{card_id}
POST   /api/adventures/{id}/state/cards/reorder
PATCH  /api/adventures/{id}/state/model-settings
```

## Turns

```text
GET    /api/adventures/{id}/turns
PATCH  /api/adventures/{id}/turns/{turn_id}
DELETE /api/adventures/{id}/turns/{turn_id}
POST   /api/adventures/{id}/turns/{turn_id}/restore
```

Deletion options:

```json
{
  "mode": "from_here",
  "revertStateChangesAfterPoint": true
}
```

Modes:

- `from_here`: default UI delete behavior
- `single`: Shift-click or turn settings menu

`revertStateChangesAfterPoint` applies to from-here delete/restore operations, not single-turn deletion.

## Generation

Non-streaming or job-style endpoints may exist, but streaming is primary.

Suggested streaming action endpoints:

```text
POST /api/adventures/{id}/generate-stream
POST /api/adventures/{id}/continue-stream
POST /api/adventures/{id}/retry-stream
POST /api/adventures/{id}/variants/{variant_id}/select
```

Generate body:

```json
{
  "actionType": "do",
  "content": "I kick the door open.",
  "modelConfigId": "model_123",
  "generationSettings": {
    "contextLimit": 32000,
    "visibleTargetTokens": 350,
    "temperature": 0.9,
    "topP": 0.95,
    "thinkingEnabled": true,
    "showThinking": false
  }
}
```

Retry body:

```json
{
  "responseGroupId": "group_123",
  "retryInstruction": "Make it tenser and less verbose.",
  "includeVariantIds": ["variant_1", "variant_2"],
  "modelConfigId": "model_123"
}
```

## SSE Event Contract

Event types:

- `generation.status`
- `generation.thinking_delta`
- `generation.content_delta`
- `generation.token_update`
- `generation.variant_created`
- `generation.final`
- `generation.error`

Status example:

```json
{
  "type": "generation.status",
  "phase": "building_context",
  "message": "Selecting story cards"
}
```

Content delta example:

```json
{
  "type": "generation.content_delta",
  "text": "Rain hissed against the neon-lit glass..."
}
```

Final example:

```json
{
  "type": "generation.final",
  "turnId": "turn_456",
  "variantId": "variant_789",
  "content": "Final post-processed text...",
  "tokenUsageId": "usage_123"
}
```

## Debug And Inspection

```text
GET /api/adventures/{id}/turns/{turn_id}/prompt-snapshot
GET /api/adventures/{id}/turns/{turn_id}/token-usage
GET /api/adventures/{id}/turns/{turn_id}/context-report
```

Context report should include:

- included modules
- activated cards
- included summary
- included memories
- included active turn range
- token estimates by layer
- model settings

## Import/Export

AID full scenario import:

```text
POST /api/imports/aid/preview
POST /api/imports/aid/confirm
```

Native import/export:

```text
POST /api/imports/imaginai/preview
POST /api/imports/imaginai/confirm
GET  /api/scenarios/{id}/export
```
