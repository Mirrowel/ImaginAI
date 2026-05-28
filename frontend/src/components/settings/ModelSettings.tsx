import { FormEvent } from "react";
import { useProviders } from "../../hooks/useProviders";
import { useUserModels, useCreateModel } from "../../hooks/useModels";
import { Panel } from "../primitives/Panel";
import { ModelForm } from "./ModelForm";
import { ModelRow } from "./ModelRow";
import { parseJsonObject } from "../../lib/parseJsonObject";

/** Model settings for user-owned model configs. */
export function ModelSettings() {
  const providers = useProviders();
  const models = useUserModels();
  const create = useCreateModel();
  /** Create a model config from the settings form. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({ providerConnectionId: form.get("providerConnectionId"), displayName: form.get("displayName"), modelId: form.get("modelId"), contextWindow: Number(form.get("contextWindow") || 32768), userContextLimitDefault: Number(form.get("userContextLimitDefault") || form.get("contextWindow") || 32768), visibleResponseTargetTokens: Number(form.get("visibleResponseTargetTokens") || 350), temperature: Number(form.get("temperature") || 0.8), topP: Number(form.get("topP") || 0.95), thinkingEnabled: form.get("thinkingEnabled") === "on", thinkingBudget: Number(form.get("thinkingBudget") || 0) || null, showThinkingDefault: form.get("showThinkingDefault") === "on", streamThinkingDefault: form.get("streamThinkingDefault") === "on", additionalSystemPrompt: form.get("additionalSystemPrompt"), extraParameters: parseJsonObject(String(form.get("extraParameters") || "{}")) });
  }
  return <section className="stack"><Panel title="Create Model"><ModelForm providers={providers.data?.items ?? []} onSubmit={submit} /></Panel><Panel title="Models">{models.data?.items.map((model, index) => <ModelRow key={model.id} model={model} models={models.data?.items ?? []} index={index} queryKey="models" admin={false} />)}</Panel></section>;
}
