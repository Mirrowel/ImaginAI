import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { GenerationEvent } from "../types";

/** Generate a turn with conditional streaming/non-streaming logic. */
export function useGenerate(adventureId: string, onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      textStreamingEnabled: boolean;
      actionType: string;
      content: string;
      modelConfigId: string | null;
      onEvent: (event: GenerationEvent) => void;
      generationSettings?: Record<string, unknown>;
    }) => {
      return vars.textStreamingEnabled
        ? api.streamGenerateTurn(adventureId, vars.actionType, vars.content, vars.modelConfigId, vars.onEvent, vars.generationSettings)
        : api.generateTurn(adventureId, vars.actionType, vars.content, vars.modelConfigId, vars.generationSettings);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] });
      onSuccess?.();
    },
  });
}

/** Continue the current adventure with conditional streaming/non-streaming logic. */
export function useContinue(adventureId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (vars: {
      textStreamingEnabled: boolean;
      modelConfigId: string | null;
      onEvent: (event: GenerationEvent) => void;
      generationSettings?: Record<string, unknown>;
    }) => {
      return vars.textStreamingEnabled
        ? api.streamContinueTurn(adventureId, vars.modelConfigId, vars.onEvent, vars.generationSettings)
        : api.continueTurn(adventureId, vars.modelConfigId, vars.generationSettings);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] });
    },
  });
}
