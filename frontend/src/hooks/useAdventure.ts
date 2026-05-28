import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { Adventure, AdventureMemory, AdventureSummary, AdventureStateEvent } from "../types";

/** Fetch adventure state and turns. */
export function useAdventure(id: string | undefined) {
  return useQuery({ queryKey: ["adventure", id], queryFn: () => api.getAdventure(id!), enabled: !!id });
}

/** List recent adventures owned by the current user with optional pagination. */
export function useAdventures(page: number) {
  return useQuery({ queryKey: ["adventures", page], queryFn: () => api.listAdventures(page) });
}

/** List all adventures for a scenario with optional pagination. */
export function useScenarioAdventures(scenarioId: string | undefined, page: number) {
  return useQuery({ queryKey: ["scenarioAdventures", scenarioId, page], queryFn: () => api.listScenarioAdventures(scenarioId!, page), enabled: !!scenarioId });
}

/** Start an adventure from a scenario. */
export function useStartAdventure(onSuccess?: (adventure: Adventure) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ scenarioId, title }: { scenarioId: string; title?: string }) => api.startAdventure(scenarioId, title),
    onSuccess: async (adventure) => { onSuccess?.(adventure); },
  });
}

/** Archive an adventure while preserving it for future restore/export. */
export function useArchiveAdventure(scenarioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.archiveAdventure(id),
    onSuccess: () => { if (scenarioId) queryClient.invalidateQueries({ queryKey: ["scenarioAdventures", scenarioId] }); },
  });
}

/** Soft-delete an adventure from normal lists. */
export function useDeleteAdventure(scenarioId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAdventure(id),
    onSuccess: () => { if (scenarioId) queryClient.invalidateQueries({ queryKey: ["scenarioAdventures", scenarioId] }); },
  });
}

/** Patch the adventure-local model config override. */
export function useUpdateAdventureModel(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelConfigId: string | null) => api.updateAdventureModel(adventureId, modelConfigId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
}

/** Patch adventure-local generation setting overrides. */
export function useUpdateAdventureGenerationSettings(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (generationSettings: Record<string, unknown>) => api.updateAdventureGenerationSettings(adventureId, generationSettings),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
}

/** Create an adventure-local story card through state events. */
export function useCreateAdventureCard(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<import("../types").StoryCard>) => api.createAdventureCard(adventureId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
}

/** Patch an adventure-local story card through state events. */
export function useUpdateAdventureCard(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ cardId, payload }: { cardId: string; payload: Partial<import("../types").StoryCard> }) => api.updateAdventureCard(adventureId, cardId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
}

/** Delete an adventure-local story card through state events. */
export function useDeleteAdventureCard(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardId: string) => api.deleteAdventureCard(adventureId, cardId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
}

/** Persist adventure-local card ordering through state events. */
export function useReorderAdventureCards(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardIds: string[]) => api.reorderAdventureCards(adventureId, cardIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
}

/** Patch an adventure-local module through append-only state events. */
export function useUpdateAdventureModule(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ moduleId, payload }: { moduleId: string; payload: Partial<import("../types").ScenarioModule> }) => api.updateAdventureModule(adventureId, moduleId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }),
  });
}

/** List adventure state events for audit and debug inspection. */
export function useStateEvents(adventureId: string) {
  return useQuery({ queryKey: ["stateEvents", adventureId], queryFn: () => api.listStateEvents(adventureId) });
}

/** Fetch the rough adventure summary used as long-term context. */
export function useSummary(adventureId: string) {
  return useQuery({ queryKey: ["summary", adventureId], queryFn: () => api.getSummary(adventureId) });
}

/** Update the rough adventure summary manually. */
export function useUpdateSummary(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.updateSummary(adventureId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["summary", adventureId] }),
  });
}

/** List precise adventure memories. */
export function useMemories(adventureId: string) {
  return useQuery({ queryKey: ["memories", adventureId], queryFn: () => api.listMemories(adventureId) });
}

/** Create a pinned adventure memory. */
export function useCreateMemory(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<AdventureMemory>) => api.createMemory(adventureId, payload),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["memories", adventureId] }); },
  });
}
