import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as api from "../api";
import type { ProviderConnection } from "../types";

/** List user provider connections with optional pagination. */
export function useProviders() {
  return useQuery({ queryKey: ["providers"], queryFn: () => api.listProviders() });
}

/** Create a user provider connection and optional primary API key. */
export function useCreateProvider(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createProvider(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["providers"] });
      onSuccess?.();
    },
  });
}

/** Patch a user provider connection. */
export function useUpdateProvider(queryKey: string = "providers") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: Record<string, unknown> }) => api.updateProvider(args.id, args.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

/** Delete a user provider connection. */
export function useDeleteProvider(queryKey: string = "providers") {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
}

/** Test that a provider has usable credentials. */
export function useTestProvider(admin: boolean) {
  return useMutation({
    mutationFn: (id: string) => admin ? api.testAdminProvider(id) : api.testProvider(id),
  });
}

/** Fetch provider-advertised upstream models. */
export function useFetchProviderModels(admin: boolean) {
  return useMutation({
    mutationFn: (id: string) => admin ? api.fetchAdminProviderModels(id) : api.fetchProviderModels(id),
  });
}

/** List admin-managed platform provider connections. */
export function useAdminProviders() {
  return useQuery({ queryKey: ["adminProviders"], queryFn: api.listAdminProviders });
}

/** Create an admin-managed platform provider connection. */
export function useCreateAdminProvider(onSuccess?: () => void) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => api.createAdminProvider(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["adminProviders"] });
      onSuccess?.();
    },
  });
}

/** Patch an admin-managed platform provider connection. */
export function useUpdateAdminProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (args: { id: string; payload: Record<string, unknown> }) => api.updateAdminProvider(args.id, args.payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminProviders"] }),
  });
}

/** Delete an admin-managed platform provider connection. */
export function useDeleteAdminProvider() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteAdminProvider(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminProviders"] }),
  });
}

/** Test an admin-managed platform provider connection. */
export function useTestAdminProvider() {
  return useMutation({
    mutationFn: (id: string) => api.testAdminProvider(id),
  });
}

/** Fetch provider-advertised upstream models for an admin provider. */
export function useFetchAdminProviderModels() {
  return useMutation({
    mutationFn: (id: string) => api.fetchAdminProviderModels(id),
  });
}
