import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateModel, useDeleteModel, useSetDefaultModel, useReorderModels, useUpdateAdminModel, useDeleteAdminModel, useSetDefaultAdminModel, useReorderAdminModels } from "../../hooks/useModels";
import type { ModelConfig } from "../../types";
import { parseJsonObject } from "../../lib/parseJsonObject";
import { moveId } from "../../lib/moveId";

/** Editable model row actions for default/toggle/delete settings. */
export function ModelRow({ model, models, index, queryKey, admin }: { model: ModelConfig; models: ModelConfig[]; index: number; queryKey: string; admin: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ displayName: model.displayName, modelId: model.modelId, contextWindow: model.contextWindow, userContextLimitDefault: model.userContextLimitDefault, visibleResponseTargetTokens: model.visibleResponseTargetTokens, temperature: model.temperature, topP: model.topP, thinkingEnabled: model.thinkingEnabled, thinkingBudget: model.thinkingBudget ?? "", showThinkingDefault: model.showThinkingDefault ?? false, streamThinkingDefault: model.streamThinkingDefault ?? false, additionalSystemPrompt: model.additionalSystemPrompt ?? "", extraParameters: JSON.stringify(model.extraParameters ?? {}, null, 2) });
  const userUpdate = useUpdateModel(queryKey);
  const adminUpdate = useUpdateAdminModel();
  const userToggle = useUpdateModel(queryKey);
  const adminToggle = useUpdateAdminModel();
  const userSetDefault = useSetDefaultModel(queryKey);
  const adminSetDefault = useSetDefaultAdminModel();
  const userDelete = useDeleteModel(queryKey);
  const adminDelete = useDeleteAdminModel();
  const userReorder = useReorderModels(queryKey);
  const adminReorder = useReorderAdminModels();

  const save = useMutation({
    mutationFn: () => admin ? adminUpdate.mutateAsync({ id: model.id, payload: { ...draft, extraParameters: parseJsonObject(draft.extraParameters) } }) : userUpdate.mutateAsync({ id: model.id, payload: { ...draft, extraParameters: parseJsonObject(draft.extraParameters) } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
  const toggle = useMutation({
    mutationFn: () => admin ? adminToggle.mutateAsync({ id: model.id, payload: { isEnabled: !model.isEnabled } }) : userToggle.mutateAsync({ id: model.id, payload: { isEnabled: !model.isEnabled } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
  const setDefault = useMutation({
    mutationFn: () => admin ? adminSetDefault.mutateAsync(model.id) : userSetDefault.mutateAsync(model.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
  const remove = useMutation({
    mutationFn: () => admin ? adminDelete.mutateAsync(model.id) : userDelete.mutateAsync(model.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
  const reorder = useMutation({
    mutationFn: (direction: -1 | 1) => admin ? adminReorder.mutateAsync(moveId(models.map((item) => item.id), index, direction)) : userReorder.mutateAsync(moveId(models.map((item) => item.id), index, direction)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });

  return <div className="list-item"><strong>{model.displayName}</strong><span>{model.providerName} · {model.modelId} · {model.ownerType} · {model.isDefault ? "default" : "not default"}</span><details><summary>Edit Model</summary><div className="stack"><input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} /><input type="number" value={draft.contextWindow} onChange={(event) => setDraft({ ...draft, contextWindow: Number(event.target.value) })} /><input type="number" value={draft.userContextLimitDefault} onChange={(event) => setDraft({ ...draft, userContextLimitDefault: Number(event.target.value) })} /><input type="number" value={draft.visibleResponseTargetTokens} onChange={(event) => setDraft({ ...draft, visibleResponseTargetTokens: Number(event.target.value) })} /><input type="number" step="0.1" value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: Number(event.target.value) })} /><input type="number" step="0.01" value={draft.topP} onChange={(event) => setDraft({ ...draft, topP: Number(event.target.value) })} /><input type="number" value={draft.thinkingBudget} onChange={(event) => setDraft({ ...draft, thinkingBudget: event.target.value ? Number(event.target.value) : "" })} /><label className="checkbox"><input type="checkbox" checked={draft.thinkingEnabled} onChange={(event) => setDraft({ ...draft, thinkingEnabled: event.target.checked })} /> Thinking enabled</label><label className="checkbox"><input type="checkbox" checked={draft.showThinkingDefault} onChange={(event) => setDraft({ ...draft, showThinkingDefault: event.target.checked })} /> Show thinking</label><label className="checkbox"><input type="checkbox" checked={draft.streamThinkingDefault} onChange={(event) => setDraft({ ...draft, streamThinkingDefault: event.target.checked })} /> Stream thinking</label><textarea value={draft.additionalSystemPrompt} onChange={(event) => setDraft({ ...draft, additionalSystemPrompt: event.target.value })} /><label>Extra Parameters JSON<textarea value={draft.extraParameters} onChange={(event) => setDraft({ ...draft, extraParameters: event.target.value })} /></label><div className="mode-row"><button onClick={() => save.mutate()} disabled={save.isPending}>Save Model</button><button className="ghost" onClick={() => toggle.mutate()}>{model.isEnabled ? "Disable" : "Enable"}</button><button className="ghost" onClick={() => setDefault.mutate()}>Set Default</button><button className="ghost" disabled={index === 0} onClick={() => reorder.mutate(-1)}>Up</button><button className="ghost" disabled={index === models.length - 1} onClick={() => reorder.mutate(1)}>Down</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div></div></details></div>;
}
