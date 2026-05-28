import { FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { useAdminProviders, useCreateAdminProvider } from "../../hooks/useProviders";
import { useAdminModels, useCreateAdminModel } from "../../hooks/useModels";
import { useAdminDiagnostics, useAdminUsage } from "../../hooks/useAdmin";
import { Panel } from "../primitives/Panel";
import { ModelForm } from "./ModelForm";
import { ModelRow } from "./ModelRow";
import { ProviderRow } from "./ProviderRow";
import { parseJsonObject } from "../../lib/parseJsonObject";

/** Admin/global provider and model settings for platform-backed models. */
export function AdminSettings() {
  const providers = useAdminProviders();
  const models = useAdminModels();
  const diagnostics = useAdminDiagnostics();
  const usage = useAdminUsage();
  const createProvider = useCreateAdminProvider();
  const createModel = useCreateAdminModel();
  /** Create a platform provider connection from the admin form. */
  function submitProvider(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createProvider.mutate({ name: form.get("name"), providerType: form.get("providerType"), protocol: form.get("protocol"), baseUrl: form.get("baseUrl"), apiKey: form.get("apiKey") });
  }
  /** Create a global model config from the admin form. */
  function submitModel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    createModel.mutate({ providerConnectionId: form.get("providerConnectionId"), displayName: form.get("displayName"), modelId: form.get("modelId"), contextWindow: Number(form.get("contextWindow") || 32768), userContextLimitDefault: Number(form.get("userContextLimitDefault") || form.get("contextWindow") || 32768), visibleResponseTargetTokens: Number(form.get("visibleResponseTargetTokens") || 350), temperature: Number(form.get("temperature") || 0.8), topP: Number(form.get("topP") || 0.95), thinkingEnabled: form.get("thinkingEnabled") === "on", thinkingBudget: Number(form.get("thinkingBudget") || 0) || null, showThinkingDefault: form.get("showThinkingDefault") === "on", streamThinkingDefault: form.get("streamThinkingDefault") === "on", additionalSystemPrompt: form.get("additionalSystemPrompt"), extraParameters: parseJsonObject(String(form.get("extraParameters") || "{}")), isDefault: form.get("isDefault") === "on" });
  }
  return <section className="stack"><header className="section-heading"><h1>Admin Settings</h1><p className="muted">Global models appear in every user's gameplay picker without exposing credentials.</p></header><Panel title="Diagnostics"><div className="diagnostics-grid">{Object.entries(diagnostics.data ?? {}).map(([key, value]) => <div className="subcard" key={key}><strong>{value}</strong><span>{key}</span></div>)}</div></Panel><Panel title="Recent Usage"><div className="list">{usage.data?.items.map((row) => <div className="list-item" key={row.id}><strong>{row.totalTokens} tokens</strong><span>{row.provider} · {row.modelId} · {row.createdAt}</span></div>)}</div></Panel><Panel title="Global Provider"><form className="stack" onSubmit={submitProvider}><input name="name" placeholder="Display name" /><input name="providerType" placeholder="openrouter/openai/gemini/custom" /><input name="protocol" defaultValue="openai_chat_completions" /><input name="baseUrl" placeholder="Optional base URL" /><input name="apiKey" placeholder="Write-only platform API key" type="password" /><button>Create Global Provider</button></form></Panel><Panel title="Global Model"><ModelForm providers={providers.data?.items ?? []} onSubmit={submitModel} /></Panel><Panel title="Global Resources"><div className="grid two"><div>{providers.data?.items.map((provider) => <ProviderRow key={provider.id} provider={provider} queryKey="adminProviders" admin />)}</div><div>{models.data?.items.map((model, index) => <ModelRow key={model.id} model={model} models={models.data?.items ?? []} index={index} queryKey="adminModels" admin />)}</div></div></Panel></section>;
}
