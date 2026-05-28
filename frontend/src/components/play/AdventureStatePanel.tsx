import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateAdventureModel, useUpdateAdventureGenerationSettings, useCreateAdventureCard, useUpdateAdventureModule, useUpdateAdventureCard, useDeleteAdventureCard, useReorderAdventureCards, useStateEvents } from "../../hooks/useAdventure";
import type { ModelConfig, ScenarioModule, StoryCard, AdventureStateEvent } from "../../types";
import { parseJsonObject } from "../../lib/parseJsonObject";
import { moveId } from "../../lib/moveId";

/** Adventure-local module and model override editor backed by state events. */
export function AdventureStatePanel({ adventure, models }: { adventure: import("../../types").Adventure; models: ModelConfig[] }) {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState(adventure.currentModelConfigId ?? adventure.state?.currentModelConfigId ?? "");
  const [temperature, setTemperature] = useState(String(adventure.state?.generationSettings?.temperature ?? ""));
  const [contextLimit, setContextLimit] = useState(String(adventure.state?.generationSettings?.contextLimit ?? ""));
  const [visibleTargetTokens, setVisibleTargetTokens] = useState(String(adventure.state?.generationSettings?.visibleTargetTokens ?? ""));

  const modelMutationHook = useUpdateAdventureModel(adventure.id);
  const settingsMutationHook = useUpdateAdventureGenerationSettings(adventure.id);
  const addCardHook = useCreateAdventureCard(adventure.id);

  const modelMutation = useMutation({
    mutationFn: () => modelMutationHook.mutateAsync(selectedModel || null),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventure.id] }),
  });
  const settingsMutation = useMutation({
    mutationFn: () => settingsMutationHook.mutateAsync({ temperature: temperature ? Number(temperature) : undefined, contextLimit: contextLimit ? Number(contextLimit) : undefined, visibleTargetTokens: visibleTargetTokens ? Number(visibleTargetTokens) : undefined }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventure.id] }),
  });
  const addCard = useMutation({
    mutationFn: () => addCardHook.mutateAsync({ title: "Adventure Detail", cardType: "concept", content: "", activationMode: "manual", triggerWords: [] }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventure.id] }),
  });

  return <div className="stack">
    <label>Adventure Model Override<select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}><option value="">Scenario/default model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}</select></label>
    <button onClick={() => modelMutation.mutate()}>Save Model Override</button>
    <div className="subcard stack"><h3>Generation Settings</h3><input placeholder="Temperature override" value={temperature} onChange={(event) => setTemperature(event.target.value)} /><input placeholder="Context limit override" value={contextLimit} onChange={(event) => setContextLimit(event.target.value)} /><input placeholder="Visible target tokens" value={visibleTargetTokens} onChange={(event) => setVisibleTargetTokens(event.target.value)} /><button onClick={() => settingsMutation.mutate()}>Save Generation Settings</button></div>
    <h3>Modules</h3><div className="list">{adventure.state?.modules.map((module) => <AdventureModuleEditor key={module.id} adventureId={adventure.id} module={module} />)}</div>
    <h3>Adventure Cards</h3><button className="ghost" onClick={() => addCard.mutate()}>Add Adventure Card</button><div className="list">{adventure.state?.cards.map((card, index, cards) => <AdventureCardEditor key={card.id} adventureId={adventure.id} card={card} cards={cards} index={index} />)}</div>
  </div>;
}

/** Inline editor for modules that have diverged in an adventure fork/state timeline. */
function AdventureModuleEditor({ adventureId, module }: { adventureId: string; module: ScenarioModule }) {
  const queryClient = useQueryClient();
  const [modContent, setModContent] = useState(module.content);
  const updateModule = useUpdateAdventureModule(adventureId);
  const save = useMutation({
    mutationFn: () => updateModule.mutateAsync({ moduleId: module.id, payload: { ...module, content: modContent } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
  return <article className="subcard stack"><strong>{module.title}</strong><textarea value={modContent} onChange={(event) => setModContent(event.target.value)} /><button onClick={() => save.mutate()}>Save Adventure Module</button></article>;
}

/** Adventure-local story card editor that records card changes as state events. */
function AdventureCardEditor({ adventureId, card, cards, index }: { adventureId: string; card: StoryCard; cards: StoryCard[]; index: number }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(card);
  const [metadataRaw, setMetadataRaw] = useState(JSON.stringify(card.metadata ?? {}, null, 2));
  const updateCard = useUpdateAdventureCard(adventureId);
  const deleteCard = useDeleteAdventureCard(adventureId);
  const reorderCards = useReorderAdventureCards(adventureId);
  const save = useMutation({
    mutationFn: () => updateCard.mutateAsync({ cardId: card.id, payload: { ...draft, metadata: parseJsonObject(metadataRaw) } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
  const remove = useMutation({
    mutationFn: () => deleteCard.mutateAsync(card.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
  const reorder = useMutation({
    mutationFn: (direction: -1 | 1) => reorderCards.mutateAsync(moveId(cards.map((item) => item.id), index, direction)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
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
    <div className="mode-row"><button onClick={() => save.mutate()} disabled={save.isPending}>Save Adventure Card</button><button className="ghost" disabled={index === 0} onClick={() => reorder.mutate(-1)}>Up</button><button className="ghost" disabled={index === cards.length - 1} onClick={() => reorder.mutate(1)}>Down</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div>
  </article>;
}

/** Collapsed state-events audit panel for debug inspection. */
export function AdventureStateEventList({ adventureId }: { adventureId: string }) {
  const events = useStateEvents(adventureId);
  return <details className="subcard"><summary>State Events ({events.data?.total ?? "…"})</summary><div className="stack">{events.data?.items.length ? events.data.items.map((event: AdventureStateEvent) => <div className="list-item" key={event.id}><div className="adventure-row-header"><strong>{event.eventType}</strong><span className={`tag ${event.isInvalidated ? "warning" : ""}`}>{event.targetType}{event.isInvalidated ? " · invalidated" : ""}</span></div><span className="muted">seq {event.stateSequence} · tl {event.timelineSequence} · {event.targetId ? `${event.targetId.slice(0, 8)}…` : "no target"} · {event.createdAt}</span></div>) : <p className="muted">No state events recorded.</p>}</div></details>;
}
