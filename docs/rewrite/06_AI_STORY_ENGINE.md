# AI Story Engine

## Principle

The story engine owns storytelling. `rotator_library` owns LLM communication.

ImaginAI decides:

- generation intent
- prompt layers
- context selection
- card activation
- summary/memory injection
- retry guidance
- visible output length target
- post-processing
- what gets saved

`rotator_library` decides:

- provider call mechanics
- streaming
- retries/failover
- credential selection
- provider-specific communication

## Generation Intents

Initial intents:

- `player_action`
- `continue`
- `retry`

Future intents:

- `opening_scene`
- `summarize`
- `memory_extract`
- `script_generated_event`
- `image_prompt`

Future script-generated events are for hard logic such as stats, conditions, rule checks, or event hooks. The script language is not chosen yet, but it should be a real language or safe embeddable runtime rather than prompt-only behavior.

## Pipeline

Every generation follows staged orchestration:

```text
1. Load adventure and ownership
2. Reconstruct active adventure state
3. Load active canonical turn history
4. Resolve selected model config
5. Build generation intent
6. Run pre-context hooks
7. Select cards, summary, memories, and recent turns
8. Build prompt/messages
9. Estimate token budget
10. Call RotatorGateway
11. Stream visible output/thinking if available
12. Apply response post-processing
13. Save generation variant or turn
14. Save prompt snapshot/token usage
15. Run post-turn hooks
```

Do not implement this as one giant function. Use services with documented seams.

## Player Actions

Supported action types:

- `do`: player attempts an action
- `say`: player speaks dialogue
- `story`: player gives narrative direction

`story` is not character dialogue. Prompt formatting must make that clear.

## Prompt Layers

Prompt should be assembled from explicit layers. Each layer should have priority, token estimate, source IDs, and debug label.

Layers:

- base system instruction
- optional model config additional instruction
- scenario/adventure instructions module
- plot essentials module
- author notes module
- future rules/style modules
- active story cards
- rough adventure summary
- relevant precise memories
- recent active canonical turns
- retry guidance and included rejected variants, if retrying
- current player action

## Summary And Memory Model

No turn compression is used.

Old turns are dropped from context when budget runs out. They are not summarized as a replacement for exact history.

### Summary

Summary is rough long-term memory of what happened since the start.

Rules:

- always injected when available
- compact and broad
- generated/maintained later by a smaller model
- complements recent turns
- does not replace turns

Example content style:

```text
The protagonist investigated the Rusted Nail, learned Teague has information about Project Icarus, and discovered VitaCorp may be tied to Lila's disappearance.
```

### Memory

Memory is precise detail.

Rules:

- selectively injected when relevant
- can be user-pinned or model-extracted later
- generated/maintained later by a smaller model
- behaves like dynamic story cards

Example content style:

```text
Captain Norman's synthetic irises flicker when she lies.
```

## Context Budgeting

Effective context limit:

```text
effective_context_limit = min(model_context_window, user_context_limit)
```

Reserve room for:

- visible response target estimate
- provider safety margin
- optional reasoning/thinking estimate

The user context slider is independent from true model context. A model may support 128k, while a user chooses 32k for faster/tighter gameplay.

## Context Selection Priority

Recommended order:

1. hard/base system instruction
2. current player action
3. core scenario/adventure modules
4. author notes
5. rough summary
6. manual/pinned cards
7. triggered high-priority cards
8. relevant precise memories
9. recent active turns
10. lower-priority cards if budget remains
11. older active turns if budget remains

Recent turns usually deserve a large portion of the remaining budget because they preserve immediate narrative flow.

## Story Card Activation

Activation modes:

- `always`
- `triggered`
- `manual`
- `disabled`

Triggered cards should consider:

- current player action
- recent active turns
- retry instruction when relevant
- later tracked entities/location/state

Matching should support:

- case-insensitive matching
- exact phrase matching
- word boundaries
- aliases
- priority
- max card token budget

Do not inject all cards by default.

## Retry Variants And Guided Retry

Retry creates a new variant in the same response group.

Retry input may include:

- retry instruction
- selected previous variants to include as comparison
- original player action
- canonical context up to the response group

Prompt framing must clarify:

```text
The following are previous rejected attempts. They are not canonical story. Use them only as guidance for what to improve or avoid.
```

Retry guidance is not canonical story and should not become memory or scenario prompt by default.

## Visible Response Length

Do not rely on provider `max_tokens` as the primary visible length control. Providers differ, and some count reasoning against output tokens.

Use:

- prompt instruction for target length
- streaming monitor where possible
- post-processing cutoff
- broad provider safety ceiling only

Default visible story turns should usually be around 200-400 visible tokens unless user/model config changes it. Reasoning tokens do not count toward desired visible story length.

## Response Post-Processing

Response postprocessor should:

- trim overlong visible output
- cut to last meaningful sentence or paragraph boundary
- avoid mid-word/mid-sentence endings
- preserve markdown validity where possible
- avoid cutting inside code fences or obvious malformed markdown structures
- keep final content coherent

Preferred cutoff boundaries:

- paragraph end
- sentence end
- dialogue sentence end
- punctuation followed by whitespace

Existing sentence cutoff logic in the old code can be used as conceptual reference but should become a dedicated service.

## Thinking/Reasoning

Model settings may support:

- thinking enabled
- thinking budget
- show thinking
- stream thinking

Rules:

- thinking hidden by default unless enabled
- visible length ignores thinking tokens
- token UI separates reasoning and visible output when possible
- if provider mixes thinking into normal output, mark separation as best effort

## Streaming

Generation should stream by default.

Stream phases:

- `queued`
- `building_context`
- `calling_model`
- `thinking`, optional
- `writing`
- `post_processing`
- `saved`

Frontend event types:

- `generation.status`
- `generation.thinking_delta`
- `generation.content_delta`
- `generation.token_update`
- `generation.variant_created`
- `generation.final`
- `generation.error`

The final saved/post-processed content replaces the live draft buffer.

## Prompt Snapshot

Every generation should save enough to debug:

- generation intent
- model config
- state sequence
- context limit
- estimated tokens by layer
- included modules
- activated cards
- included summary
- included memories
- included turn range
- messages sent or sufficient equivalent

This enables prompt/token inspection and future debugging.

## Hooks

The story engine should expose documented hook points:

- `before_state_load`
- `after_state_load`
- `before_context_selection`
- `after_context_selection`
- `before_prompt_build`
- `after_prompt_build`
- `before_model_call`
- `on_stream_chunk`
- `after_model_response`
- `before_turn_commit`
- `after_turn_commit`
- `after_variant_selected`
- `after_fork_created`

Initial hooks may be no-ops. They exist so memory, scripts, stats, image generation, safety/style filters, and future systems can attach cleanly.

## MVP Scope

Build first:

- Do/Say/Story generation
- Continue
- guided Retry variants
- streaming
- prompt snapshots
- token estimates
- context slider
- model generation settings
- active card triggering
- response post-processing
- rotator-only LLM calls

Defer:

- automatic memory extraction
- automatic summary updates
- RAG
- script execution
- image generation
- complex sync/merge tools
