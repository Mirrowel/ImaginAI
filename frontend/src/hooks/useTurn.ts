import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { GenerationEvent } from "../types";

/** Submit a Do/Say/Story action using the non-streaming fallback endpoint. */
export function useGenerateTurn() {
  return useMutation({
    mutationFn: (args: { adventureId: string; actionType: string; content: string; modelConfigId?: string | null; generationSettings?: Record<string, unknown> }) =>
      api.generateTurn(args.adventureId, args.actionType, args.content, args.modelConfigId, args.generationSettings),
  });
}

/** Submit a Do/Say/Story action through the streaming endpoint. */
export function useStreamGenerateTurn() {
  return useMutation({
    mutationFn: (args: { adventureId: string; actionType: string; content: string; modelConfigId: string | null; onEvent: (event: GenerationEvent) => void; generationSettings?: Record<string, unknown> }) =>
      api.streamGenerateTurn(args.adventureId, args.actionType, args.content, args.modelConfigId, args.onEvent, args.generationSettings),
  });
}

/** Continue the current adventure using the non-streaming fallback endpoint. */
export function useContinueTurn() {
  return useMutation({
    mutationFn: (args: { adventureId: string; modelConfigId?: string | null; generationSettings?: Record<string, unknown> }) =>
      api.continueTurn(args.adventureId, args.modelConfigId, args.generationSettings),
  });
}

/** Continue the current adventure through the streaming endpoint. */
export function useStreamContinueTurn() {
  return useMutation({
    mutationFn: (args: { adventureId: string; modelConfigId: string | null; onEvent: (event: GenerationEvent) => void; generationSettings?: Record<string, unknown> }) =>
      api.streamContinueTurn(args.adventureId, args.modelConfigId, args.onEvent, args.generationSettings),
  });
}

/** Fork an adventure from the selected turn. */
export function useForkAdventure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { adventureId: string; fromTurnId: string; title: string; note: string; switchToFork: boolean }) =>
      api.forkAdventure(args.adventureId, args.fromTurnId, args.title, args.note, args.switchToFork),
    onSuccess: async (_forked, args) => {
      await queryClient.invalidateQueries({ queryKey: ["adventure", args.adventureId] });
      await queryClient.invalidateQueries({ queryKey: ["adventures"] });
    },
  });
}

/** Retry one assistant response group through the streaming endpoint. */
export function useStreamRetryTurn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { adventureId: string; responseGroupId: string; retryInstruction: string; modelConfigId: string | null; includeVariantIds: string[]; onEvent: (event: GenerationEvent) => void; generationSettings?: Record<string, unknown> }) =>
      api.streamRetryTurn(args.adventureId, args.responseGroupId, args.retryInstruction, args.modelConfigId, args.includeVariantIds, args.onEvent, args.generationSettings),
    onSuccess: (_result, args) => {
      queryClient.invalidateQueries({ queryKey: ["adventure", args.adventureId] });
      queryClient.invalidateQueries({ queryKey: ["variants", args.adventureId, args.responseGroupId] });
    },
  });
}

/** Patch a turn's content. */
export function useSaveTurn(adventureId: string, turnId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (content: string) => api.api(`/adventures/${adventureId}/turns/${turnId}`, { method: "PATCH", body: JSON.stringify({ content }) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }); },
  });
}

/** Delete a turn with mode and revert options. */
export function useDeleteTurn(adventureId: string, turnId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { mode: "from_here" | "single"; revertStateChangesAfterPoint: boolean }) =>
      api.api(`/adventures/${adventureId}/turns/${turnId}`, { method: "DELETE", body: JSON.stringify(args) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }); },
  });
}

/** Restore a previously deleted turn. */
export function useRestoreTurn(adventureId: string, turnId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { mode: "from_here" | "single"; restoreStateChangesAfterPoint: boolean }) =>
      api.api(`/adventures/${adventureId}/turns/${turnId}/restore`, { method: "POST", body: JSON.stringify(args) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }); },
  });
}

/** List variants for a response group. */
export function useVariants(adventureId: string, responseGroupId: string | undefined | null) {
  return useQuery({ queryKey: ["variants", adventureId, responseGroupId], queryFn: () => api.listVariants(adventureId, responseGroupId), enabled: !!responseGroupId });
}

/** Select an archived/active variant as the canonical assistant response. */
export function useSelectVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { adventureId: string; variantId: string }) => api.selectVariant(args.adventureId, args.variantId),
    onSuccess: (_variant, args) => { queryClient.invalidateQueries({ queryKey: ["adventure", args.adventureId] }); },
  });
}

/** Fetch the context report for generated turn inspection. */
export function useContextReport(adventureId: string, turnId: string) {
  return useQuery<import("../types").ContextReport>({ queryKey: ["contextReport", adventureId, turnId], queryFn: () => api.getContextReport(adventureId, turnId) });
}

/** Fetch full prompt snapshot details for generated turn debugging. */
export function usePromptSnapshot(adventureId: string, turnId: string, enabled: boolean) {
  return useQuery({ queryKey: ["promptSnapshot", adventureId, turnId], queryFn: () => api.getPromptSnapshot(adventureId, turnId), enabled });
}

/** Fetch token usage details for generated turn debugging. */
export function useTokenUsage(adventureId: string, turnId: string, enabled: boolean) {
  return useQuery({ queryKey: ["tokenUsage", adventureId, turnId], queryFn: () => api.getTokenUsage(adventureId, turnId), enabled });
}
