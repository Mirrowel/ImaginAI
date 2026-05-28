import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useUpdateProvider, useDeleteProvider, useTestProvider, useFetchProviderModels, useUpdateAdminProvider, useDeleteAdminProvider } from "../../hooks/useProviders";
import type { ProviderConnection } from "../../types";

/** Display safe provider metadata without raw credential material. */
export function ProviderRow({ provider, queryKey, admin }: { provider: ProviderConnection; queryKey: string; admin: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ name: provider.name, protocol: provider.protocol, baseUrl: provider.baseUrl, apiKey: "" });
  const userUpdate = useUpdateProvider(queryKey);
  const adminUpdate = useUpdateAdminProvider();
  const userDelete = useDeleteProvider(queryKey);
  const adminDelete = useDeleteAdminProvider();
  const testHook = useTestProvider(admin);
  const modelDiscoveryHook = useFetchProviderModels(admin);

  const toggle = useMutation({
    mutationFn: () => admin ? adminUpdate.mutateAsync({ id: provider.id, payload: { isEnabled: !provider.isEnabled } }) : userUpdate.mutateAsync({ id: provider.id, payload: { isEnabled: !provider.isEnabled } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
  const save = useMutation({
    mutationFn: () => admin ? adminUpdate.mutateAsync({ id: provider.id, payload: draft }) : userUpdate.mutateAsync({ id: provider.id, payload: draft }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
  const remove = useMutation({
    mutationFn: () => admin ? adminDelete.mutateAsync(provider.id) : userDelete.mutateAsync(provider.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }),
  });
  const test = useMutation({ mutationFn: () => testHook.mutateAsync(provider.id) });
  const modelDiscovery = useMutation({ mutationFn: () => modelDiscoveryHook.mutateAsync(provider.id) });

  return <div className="list-item"><strong>{provider.name}</strong><span>{provider.providerType} · {provider.hasCredential ? "credential configured" : "no credential"} · {provider.isEnabled ? "enabled" : "disabled"}</span><details><summary>Edit Provider</summary><div className="stack"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input value={draft.protocol} onChange={(event) => setDraft({ ...draft, protocol: event.target.value })} /><input value={draft.baseUrl} placeholder="Base URL" onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} /><input value={draft.apiKey} placeholder="New write-only API key" type="password" onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} /><button onClick={() => save.mutate()}>Save Provider</button></div></details><div className="mode-row"><button className="ghost" onClick={() => toggle.mutate()}>{provider.isEnabled ? "Disable" : "Enable"}</button><button className="ghost" onClick={() => test.mutate()}>Test</button><button className="ghost" onClick={() => modelDiscovery.mutate()}>Fetch Models</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div>{test.data ? <span>{test.data.ok ? "Connection has credentials" : "No usable credential"}</span> : null}{modelDiscovery.data ? <pre>{JSON.stringify(modelDiscovery.data.models, null, 2)}</pre> : null}</div>;
}
