import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";

/** List user/provider model picker entries with optional pagination. */
export function useAvailableModels() {
  return useQuery({ queryKey: ["availableModels"], queryFn: () => api.availableModels() });
}

/** List user model configs with optional pagination. */
export function useUserModels() {
  return useQuery({ queryKey: ["models"], queryFn: () => api.listModels() });
}

/** Create a user model config. */
export function useCreateModel(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createModel(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["models"] });
      onSuccess?.();
    },
  });
}

/** Patch a user model config. */
export function useUpdateModel(queryKey: string = "models") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: Record<string, unknown> }) => api.updateModel(args.id, args.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

/** Delete a user model config. */
export function useDeleteModel(queryKey: string = "models") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

/** Mark a user model config as default. */
export function useSetDefaultModel(queryKey: string = "models") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.setDefaultModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

/** Persist user model picker ordering. */
export function useReorderModels(queryKey: string = "models") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelConfigIds: string[]) => api.reorderModels(modelConfigIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

/** List admin-managed platform model configs. */
export function useAdminModels() {
  return useQuery({ queryKey: ["adminModels"], queryFn: api.listAdminModels });
}

/** Create an admin-managed platform model config. */
export function useCreateAdminModel(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createAdminModel(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adminModels"] });
      onSuccess?.();
    },
  });
}

/** Patch an admin-managed platform model config. */
export function useUpdateAdminModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: Record<string, unknown> }) => api.updateAdminModel(args.id, args.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }),
  });
}

/** Delete an admin-managed platform model config. */
export function useDeleteAdminModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAdminModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }),
  });
}

/** Mark an admin model config as global default. */
export function useSetDefaultAdminModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.setDefaultAdminModel(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }),
  });
}

/** Persist platform/global model picker ordering. */
export function useReorderAdminModels() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (modelConfigIds: string[]) => api.reorderAdminModels(modelConfigIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }),
  });
}
