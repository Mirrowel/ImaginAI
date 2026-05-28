import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSummary, useUpdateSummary, useMemories, useCreateMemory } from "../../hooks/useAdventure";

/** Manual summary and pinned-memory panel for the future memory worker seam. */
export function AdventureMemoryPanel({ adventureId }: { adventureId: string }) {
  const queryClient = useQueryClient();
  const summary = useSummary(adventureId);
  const memories = useMemories(adventureId);
  const [summaryText, setSummaryText] = useState("");
  const [memoryTitle, setMemoryTitle] = useState("Pinned detail");
  const [memoryContent, setMemoryContent] = useState("");
  const saveSummaryHook = useUpdateSummary(adventureId);
  const createMemoryHook = useCreateMemory(adventureId);
  const saveSummary = useMutation({
    mutationFn: () => saveSummaryHook.mutateAsync(summaryText),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["summary", adventureId] }),
  });
  const createMemory = useMutation({
    mutationFn: () => createMemoryHook.mutateAsync({ title: memoryTitle, content: memoryContent, isPinned: true }),
    onSuccess: async () => { setMemoryContent(""); await queryClient.invalidateQueries({ queryKey: ["memories", adventureId] }); },
  });
  /** Initialize editable summary text from server state once loaded. */
  function syncSummary(): string {
    if (!summaryText && summary.data?.content) return summary.data.content;
    return summaryText;
  }
  return <details className="card"><summary>Memory And Summary</summary><div className="stack"><label>Rough Summary<textarea value={syncSummary()} onChange={(event) => setSummaryText(event.target.value)} /></label><button onClick={() => saveSummary.mutate()}>Save Summary</button><form className="stack" onSubmit={(event) => { event.preventDefault(); createMemory.mutate(); }}><input value={memoryTitle} onChange={(event) => setMemoryTitle(event.target.value)} /><textarea placeholder="Precise memory to pin" value={memoryContent} onChange={(event) => setMemoryContent(event.target.value)} /><button>Add Pinned Memory</button></form><div className="list">{memories.data?.items.map((memory) => <div className="list-item" key={memory.id}><strong>{memory.title}</strong><span>{memory.scope} · {memory.isPinned ? "pinned" : "dynamic"}</span><p>{memory.content}</p></div>)}</div></div></details>;
}
