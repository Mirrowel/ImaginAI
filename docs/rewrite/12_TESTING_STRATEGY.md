# Testing Strategy

## Principle

The rewrite needs tests from day one. The most important systems are state reconstruction, credential isolation, generation orchestration, and import mapping.

## Backend Unit Tests

### Adventure State Reconstruction

Test:

- applying module/card/model events reconstructs expected state
- historical reconstruction includes timeline-appropriate events
- active reconstruction ignores invalidated events
- event order is stable by timeline/state sequence
- cache, if used, does not affect correctness

### Forking

Test:

- fork from old turn reconstructs old state, not current state
- fork from after card edit includes card edit
- fork from before card edit excludes card edit
- forks of forks preserve root/parent metadata
- fork materializes independent snapshot

### Turn Deletion And Restore

Test:

- default deletion deletes from selected turn onward
- single deletion deletes only selected turn
- deleted turns are excluded from prompt history
- deleted turns remain restorable
- from-here delete with revert state changes invalidates later state events
- from-here delete without revert keeps manual state changes active
- restore can make archived variants available again when returning to a response group

### Retry Variants

Test:

- retry creates new variant in same response group
- selected variant becomes canonical
- archived variants remain archived
- continuing commits selected variant
- retry guidance is included in prompt but not saved as canonical story
- selected previous variants are framed as rejected attempts

### Card Activation

Test:

- trigger words activate correct cards
- matching is case-insensitive
- word boundaries avoid false positives
- always/manual/disabled modes work
- priority and token budget limit card injection
- not all cards are injected by default

### Context Budgeting

Test:

- effective context limit is min(model window, user slider)
- fixed layers are budgeted
- old active turns are dropped when budget fills
- turns are not compressed
- summary is always included when available
- memories are selectively included
- token estimates are recorded by layer

### Response Post-Processing

Test:

- cuts to sentence/paragraph boundary
- avoids mid-word/mid-sentence output
- handles markdown reasonably
- visible response target ignores reasoning tokens where metadata allows

### Provider/Model Security

Test:

- user model never uses platform credential
- user model never uses another user's credential
- global model hides credential details
- disabled credential/model/provider cannot be used
- secrets are write-only in API responses
- decrypted secrets are not logged or saved in prompt snapshots

## API Tests

Test:

- auth/register/login/logout/me
- ownership boundaries for scenarios/adventures/providers/models
- admin-only global provider/model endpoints
- scenario CRUD/duplicate/version freeze
- adventure start/fork/list
- turn delete/restore
- generation endpoints with mocked RotatorGateway
- import preview/confirm

## Import Tests

Use real samples from `AID/` where possible.

Test:

- AID story card mapping
- full AID scenario import creates modules/cards
- missing/unknown fields produce warnings
- malformed cards do not crash importer
- native export/import round trip
- exports do not include secrets

## RotatorGateway Tests

Mock `rotator_library`.

Test:

- model config resolves to provider connection
- correct classifier string is built
- correct provider alias/model string is built
- private/scoped credentials are passed
- global and user scopes are isolated
- model discovery uses correct credential scope
- errors are normalized
- stream chunks are normalized

## Frontend Tests

Use component/integration tests for logic-heavy flows.

Test:

- auth flow
- scenario editor save/import basics
- model/provider settings forms hide secrets
- gameplay submit Do/Say/Story
- streaming buffer updates and final replacement
- retry variant switching
- guided retry form
- fork dialog behavior
- default delete from here vs single-delete modifier/menu
- model picker merges user/global models safely

## Regression Tests To Prioritize

- Fork from old turn reconstructs old state.
- Deleting turns does not corrupt timeline.
- User credentials never leak across users or into platform scope.
- Global model secrets never appear in user responses.
- Context builder drops oldest turns and never silently summarizes them.
- Retry variants do not become canonical until selected/continued.
- AID import maps `keys`, `value`, `description`, `title`, `type` correctly.

## Secret Redaction Tests

Explicitly test that raw secrets do not appear in:

- logs
- API responses
- prompt snapshots
- token usage metadata
- stream events
- import/export files
- error messages

## Test Infrastructure

Backend:

- pytest recommended
- factory helpers for users/scenarios/adventures
- mocked RotatorGateway for generation tests
- transactional DB tests for state reconstruction

Frontend:

- Vitest or equivalent
- Testing Library
- mocked API/stream helpers
