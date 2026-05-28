import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ScenarioModule } from "../../types";
import { useUpdateScenarioModule, useDeleteScenarioModule, useReorderScenarioModules } from "../../hooks/useScenario";
import { parseJsonObject } from "../../lib/parseJsonObject";
import { moveId } from "../../lib/moveId";

/** Inline editor for one scenario draft module. */
export function ModuleEditor({ module, modules, index, scenarioId }: { module: ScenarioModule; modules: ScenarioModule[]; index: number; scenarioId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(module.title);
  const [content, setContent] = useState(module.content);
  const [settingsRaw, setSettingsRaw] = useState(JSON.stringify(module.settings ?? {}, null, 2));
  const updateModule = useUpdateScenarioModule();
  const deleteModule = useDeleteScenarioModule();
  const reorderModules = useReorderScenarioModules(scenarioId);

  const save = useMutation({
    mutationFn: () => updateModule.mutateAsync({ moduleId: module.id, payload: { title, content, settings: parseJsonObject(settingsRaw) } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
  const remove = useMutation({
    mutationFn: () => deleteModule.mutateAsync(module.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
  const toggleEnabled = useMutation({
    mutationFn: () => updateModule.mutateAsync({ moduleId: module.id, payload: { isEnabled: !module.isEnabled } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
  const reorder = useMutation({
    mutationFn: (direction: -1 | 1) => reorderModules.mutateAsync(moveId(modules.map((item) => item.id), index, direction)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });

  return <article className={`subcard stack ${module.isEnabled ? "" : "module-disabled"}`}><input value={title} onChange={(event) => setTitle(event.target.value)} /><textarea value={content} onChange={(event) => setContent(event.target.value)} /><label>Settings JSON<textarea className="json-input-sm" value={settingsRaw} onChange={(event) => setSettingsRaw(event.target.value)} /></label><div className="mode-row"><button onClick={() => save.mutate()} disabled={save.isPending}>Save Module</button><button className="ghost" onClick={() => toggleEnabled.mutate()}>{module.isEnabled ? "Disable" : "Enable"}</button><button className="ghost" disabled={index === 0} onClick={() => reorder.mutate(-1)}>Up</button><button className="ghost" disabled={index === modules.length - 1} onClick={() => reorder.mutate(1)}>Down</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div></article>;
}
