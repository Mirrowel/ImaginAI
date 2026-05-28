import { FormEvent } from "react";
import { useProviders, useCreateProvider } from "../../hooks/useProviders";
import { ProviderRow } from "./ProviderRow";
import { Panel } from "../primitives/Panel";

/** Provider settings for user-owned provider connections and write-only API keys. */
export function ProviderSettings() {
  const providers = useProviders();
  const create = useCreateProvider();
  /** Create a provider connection from the settings form. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({ name: form.get("name"), providerType: form.get("providerType"), protocol: form.get("protocol"), baseUrl: form.get("baseUrl"), apiKey: form.get("apiKey") });
    event.currentTarget.reset();
  }
  return <section className="stack"><Panel title="Add Provider"><form className="stack" onSubmit={submit}><input name="name" placeholder="Display name" /><input name="providerType" placeholder="openrouter/openai/gemini/custom" /><input name="protocol" defaultValue="openai_chat_completions" /><input name="baseUrl" placeholder="Optional base URL" /><input name="apiKey" placeholder="Write-only API key" type="password" /><button>Add Provider</button></form></Panel><Panel title="Providers">{providers.data?.items.map((provider) => <ProviderRow key={provider.id} provider={provider} queryKey="providers" admin={false} />)}</Panel></section>;
}
