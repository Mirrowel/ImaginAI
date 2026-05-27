# AID Import And Export

## Requirement

AI Dungeon compatibility is core, not a later nice-to-have.

The rewrite must support full AID scenario import where possible, not only story card import. Story cards are the most important compatibility target, but scenario-level fields should also be mapped.

## Import Flow

Use preview/confirm, not blind import.

```text
POST /api/imports/aid/preview
POST /api/imports/aid/confirm
```

Preview should:

- parse the file
- detect known AID format variants
- show scenario fields that can be mapped
- show story cards
- show warnings for unsupported fields
- allow user confirmation before saving

Confirm should:

- create scenario draft and/or version
- create modules
- create story cards
- preserve import metadata
- report recoverable mapping warnings

## Story Card Mapping

Known AID story card fields:

- `title`
- `type`
- `description`
- `value`
- `keys`
- `useForCharacterCreation`

Mapping:

```text
AID title                   -> StoryCard.title
AID type                    -> StoryCard.card_type
AID description             -> StoryCard.summary
AID value                   -> StoryCard.content
AID keys                    -> StoryCard.trigger_words
AID useForCharacterCreation -> StoryCard.use_for_character_creation
```

Trigger words:

- split comma-separated strings where needed
- trim whitespace
- preserve original raw keys in metadata if useful
- normalize for matching separately from display

## Scenario-Level Mapping

AID scenario exports may vary. Import service should be tolerant.

Potential mapping:

- scenario title/name -> `Scenario.title`
- scenario description -> `Scenario.description` or player description module
- prompt/instructions -> instructions module
- memory/world info -> plot essentials or author notes depending on source field
- opening text -> opening scene module
- tags -> scenario tags
- public/private metadata -> visibility if safe

If the importer cannot confidently map a field, preserve it in import metadata and show warning.

## Native ImaginAI Import/Export

Native format should preserve the full ImaginAI data model:

- scenario metadata
- version metadata
- modules
- cards
- default model reference by safe name/id if possible
- import/export schema version

Native export should not include secrets or private provider credentials.

## Import Metadata

Store metadata such as:

- source type: `aid` or `imaginai`
- source filename
- detected schema/version if any
- original raw fields that were not mapped
- warnings
- import timestamp

## Validation And Warnings

Preview should warn about:

- missing title
- unsupported AID fields
- empty card content
- duplicate card titles
- very long cards
- trigger words that appear malformed
- scenario fields that could map to multiple modules

Warnings should not necessarily block import.

## Export

Story card export to AID format should map back:

```text
StoryCard.title                      -> title
StoryCard.card_type                  -> type
StoryCard.summary                    -> description
StoryCard.content                    -> value
StoryCard.trigger_words              -> keys
StoryCard.use_for_character_creation -> useForCharacterCreation
```

Full AID scenario export can be added if format confidence is high. Native export should be the authoritative backup/share format.

## Tests

Import tests should use real sample files from `AID/` where possible.

Test:

- full scenario import creates scenario/modules/cards
- story card field mapping
- malformed/missing fields produce warnings
- native export/import round trip
- secrets are never exported
