import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type { StoryCard } from "../../types";
import { useUpdateScenarioCard, useDeleteScenarioCard, useReorderScenarioCards } from "../../hooks/useScenario";
import { parseJsonObject } from "../../lib/parseJsonObject";
import { moveId } from "../../lib/moveId";
import { useMutation } from "@tanstack/react-query";

/** Inline editor for an AID-compatible story card. */
export function CardEditor({ card, scenarioId, cards, index }: { card: StoryCard; scenarioId: string; cards: StoryCard[]; index: number }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(card);
  const [metadataRaw, setMetadataRaw] = useState(JSON.stringify(card.metadata ?? {}, null, 2));
  const updateCard = useUpdateScenarioCard();
  const deleteCard = useDeleteScenarioCard();
  const reorderCards = useReorderScenarioCards(scenarioId);

  const save = useMutation({
    mutationFn: () => updateCard.mutateAsync({ cardId: card.id, payload: { ...draft, metadata: parseJsonObject(metadataRaw) } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
  const remove = useMutation({
    mutationFn: () => deleteCard.mutateAsync(card.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
  const reorder = useMutation({
    mutationFn: (direction: -1 | 1) => reorderCards.mutateAsync(moveId(cards.map((item) => item.id), index, direction)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });

  return <article className="subcard stack">
    <div className="mode-row"><label className="checkbox"><input type="checkbox" checked={draft.isEnabled} onChange={(event) => setDraft({ ...draft, isEnabled: event.target.checked })} /> Enabled</label><label className="checkbox"><input type="checkbox" checked={draft.useForCharacterCreation} onChange={(event) => setDraft({ ...draft, useForCharacterCreation: event.target.checked })} /> Character creation</label></div>
    <label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
    <label>Type<input value={draft.cardType} onChange={(event) => setDraft({ ...draft, cardType: event.target.value })} /></label>
    <label>Summary<input value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
    <label>Activation Mode<select value={draft.activationMode} onChange={(event) => setDraft({ ...draft, activationMode: event.target.value as StoryCard["activationMode"] })}><option value="always">Always</option><option value="triggered">Triggered</option><option value="manual">Manual</option><option value="disabled">Disabled</option></select></label>
    <label>Priority<input type="number" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} /></label>
    <label>Token Budget<input type="number" placeholder="No budget" value={draft.tokenBudget ?? ""} onChange={(event) => setDraft({ ...draft, tokenBudget: event.target.value ? Number(event.target.value) : null })} /></label>
    <label>Trigger Words<input value={draft.triggerWords.join(", ")} onChange={(event) => setDraft({ ...draft, triggerWords: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
    <label>Content<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
    <label>Metadata JSON<textarea className="json-input-sm" value={metadataRaw} onChange={(event) => setMetadataRaw(event.target.value)} /></label>
    <div className="mode-row"><button onClick={() => save.mutate()} disabled={save.isPending}>Save Card</button><button className="ghost" disabled={index === 0} onClick={() => reorder.mutate(-1)}>Up</button><button className="ghost" disabled={index === cards.length - 1} onClick={() => reorder.mutate(1)}>Down</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div>
  </article>;
}
