import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { Scenario } from "../types";

/** List user-owned scenarios with optional pagination. */
export function useScenarios(page?: number) {
  return useQuery({ queryKey: ["scenarios", page], queryFn: () => api.listScenarios(page) });
}

/** Fetch a scenario with draft modules and cards. */
export function useScenario(id: string | undefined) {
  return useQuery({ queryKey: ["scenario", id], queryFn: () => api.getScenario(id!), enabled: !!id });
}

/** List immutable scenario versions. */
export function useScenarioVersions(id: string | undefined) {
  return useQuery({ queryKey: ["scenarioVersions", id], queryFn: () => api.listScenarioVersions(id!), enabled: !!id });
}

/** Create a minimal scenario draft. */
export function useCreateScenario(onSuccess?: (scenario: Scenario) => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (title: string) => api.createScenario(title),
    onSuccess: async (scenario) => {
      await queryClient.invalidateQueries({ queryKey: ["scenarios"] });
      onSuccess?.(scenario);
    },
  });
}

/** Patch scenario metadata. */
export function useUpdateScenario(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<Scenario>) => api.updateScenario(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", id] }),
  });
}

/** Delete a scenario draft and its rewrite-owned content. */
export function useDeleteScenario(onSuccess?: () => void) {
  return useMutation({
    mutationFn: (id: string) => api.deleteScenario(id),
    onSuccess: async () => { onSuccess?.(); },
  });
}

/** Duplicate a scenario draft for experimentation. */
export function useDuplicateScenario(onSuccess?: (copy: Scenario) => void) {
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) => api.duplicateScenario(id, title),
    onSuccess: async (copy) => { onSuccess?.(copy); },
  });
}

/** Freeze the current draft into an immutable version. */
export function useFreezeScenario(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changeNote?: string) => api.freezeScenario(id, changeNote),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarioVersions", id] }),
  });
}

/** Export a native ImaginAI scenario payload. */
export function useExportScenario(id: string) {
  return useMutation({
    mutationFn: () => api.exportScenario(id),
  });
}

/** Create a scenario draft module. */
export function useCreateScenarioModule(scenarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<import("../types").ScenarioModule>) => api.createScenarioModule(scenarioId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
}

/** Patch a scenario draft module. */
export function useUpdateScenarioModule() {
  return useMutation({
    mutationFn: (args: { moduleId: string; payload: Partial<import("../types").ScenarioModule> }) => api.updateScenarioModule(args.moduleId, args.payload),
  });
}

/** Delete a scenario draft module. */
export function useDeleteScenarioModule() {
  return useMutation({
    mutationFn: (moduleId: string) => api.deleteScenarioModule(moduleId),
  });
}

/** Persist scenario draft module order. */
export function useReorderScenarioModules(scenarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (moduleIds: string[]) => api.reorderScenarioModules(scenarioId, moduleIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
}

/** Create a scenario draft card. */
export function useCreateScenarioCard(scenarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<import("../types").StoryCard>) => api.createScenarioCard(scenarioId, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
}

/** Patch a scenario draft card. */
export function useUpdateScenarioCard() {
  return useMutation({
    mutationFn: (args: { cardId: string; payload: Partial<import("../types").StoryCard> }) => api.updateScenarioCard(args.cardId, args.payload),
  });
}

/** Delete a scenario draft card. */
export function useDeleteScenarioCard() {
  return useMutation({
    mutationFn: (cardId: string) => api.deleteScenarioCard(cardId),
  });
}

/** Persist scenario draft card order. */
export function useReorderScenarioCards(scenarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (cardIds: string[]) => api.reorderScenarioCards(scenarioId, cardIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
}

/** Import draft story cards into a scenario. */
export function useImportScenarioCards(scenarioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { cards: Partial<import("../types").StoryCard>[]; replace: boolean }) => api.importScenarioCards(scenarioId, args.cards, args.replace),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }),
  });
}

/** Export draft story cards in AID-compatible format. */
export function useExportScenarioCards(scenarioId: string) {
  return useMutation({
    mutationFn: () => api.exportScenarioCards(scenarioId),
  });
}
