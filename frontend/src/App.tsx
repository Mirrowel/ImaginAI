import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FormEvent, ReactNode, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import * as api from "./api";
import type { AdventureTurn, ImportPreview, ModelConfig, ProviderConnection, Scenario, StoryCard } from "./types";
import { useUiStore } from "./uiStore";

/** Top-level route shell that protects app routes behind session auth. */
export function App() {
  const me = useQuery({ queryKey: ["me"], queryFn: api.getMe });
  if (me.isLoading) return <FullScreenMessage title="Loading ImaginAI" />;
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route path="/*" element={me.data?.user ? <AppShell /> : <Navigate to="/login" replace />} />
    </Routes>
  );
}

/** Shared authenticated navigation and route layout. */
function AppShell() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/login");
    },
  });
  return (
    <div className="app-shell">
      <aside className="nav-panel">
        <Link className="brand" to="/">ImaginAI</Link>
        <Link to="/scenarios">Scenarios</Link>
        <Link to="/providers">Providers</Link>
        <Link to="/models">Models</Link>
        <Link to="/import">Import</Link>
        <button onClick={() => logoutMutation.mutate()}>Logout</button>
      </aside>
      <main className="main-panel">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scenarios" element={<ScenarioLibrary />} />
          <Route path="/scenarios/:scenarioId" element={<ScenarioEditor />} />
          <Route path="/scenarios/:scenarioId/adventures" element={<ScenarioAdventureList />} />
          <Route path="/adventures/:adventureId" element={<Gameplay />} />
          <Route path="/providers" element={<ProviderSettings />} />
          <Route path="/models" element={<ModelSettings />} />
          <Route path="/import" element={<ImportFlow />} />
        </Routes>
      </main>
    </div>
  );
}

/** Render a full-screen loading or error message. */
function FullScreenMessage({ title }: { title: string }) {
  return <div className="full-screen"><h1>{title}</h1></div>;
}

/** Login/register page for alpha nickname-password auth. */
function AuthPage() {
  const [nickname, setNickname] = useState("Admin");
  const [password, setPassword] = useState("123");
  const [mode, setMode] = useState<"login" | "register">("login");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const mutation = useMutation({
    mutationFn: () => (mode === "login" ? api.login(nickname, password) : api.register(nickname, password)),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/");
    },
  });
  /** Submit credentials through the selected alpha auth action. */
  function submit(event: FormEvent) {
    event.preventDefault();
    mutation.mutate();
  }
  return (
    <div className="auth-screen">
      <form className="card auth-card" onSubmit={submit}>
        <p className="eyebrow">Self-host alpha</p>
        <h1>{mode === "login" ? "Enter the story engine" : "Create a storyteller"}</h1>
        <label>Nickname<input value={nickname} onChange={(event) => setNickname(event.target.value)} /></label>
        <label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        <button type="submit">{mode === "login" ? "Login" : "Register"}</button>
        <button type="button" className="ghost" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Need an account?" : "Have an account?"}</button>
        <p className="warning">Dev seed command creates Admin / 123. Change it before production.</p>
        {mutation.error ? <p className="error">{String(mutation.error.message)}</p> : null}
      </form>
    </div>
  );
}

/** Dashboard with recent scenarios, adventures entry points, and setup warnings. */
function Dashboard() {
  const scenarios = useQuery({ queryKey: ["scenarios"], queryFn: api.listScenarios });
  const models = useQuery({ queryKey: ["availableModels"], queryFn: api.availableModels });
  return (
    <section className="stack">
      <header className="hero"><p className="eyebrow">Story sandbox</p><h1>Build worlds, fork adventures, and steer the model.</h1></header>
      {models.data?.total === 0 ? <div className="notice">No enabled models yet. Add a provider and model config before live AI generation, or enable fake LLM mode for local tests.</div> : null}
      <div className="grid two">
        <Panel title="Recent Scenarios"><ScenarioList scenarios={scenarios.data?.items ?? []} /></Panel>
        <Panel title="Quick Actions"><Link className="button" to="/scenarios">Create or edit scenarios</Link><Link className="button ghost" to="/import">Import AID scenario</Link></Panel>
      </div>
    </section>
  );
}

/** Reusable titled panel for app sections. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card"><h2>{title}</h2>{children}</section>;
}

/** Scenario list shared by dashboard and library screens. */
function ScenarioList({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <div className="list">
      {scenarios.map((scenario) => <Link key={scenario.id} className="list-item" to={`/scenarios/${scenario.id}`}><strong>{scenario.title}</strong><span>{scenario.description || "No description yet"}</span></Link>)}
      {scenarios.length === 0 ? <p className="muted">No scenarios yet.</p> : null}
    </div>
  );
}

/** Scenario library with create/import/edit/adventure entry points. */
function ScenarioLibrary() {
  const [title, setTitle] = useState("Untitled Scenario");
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const scenarios = useQuery({ queryKey: ["scenarios"], queryFn: api.listScenarios });
  const create = useMutation({ mutationFn: () => api.createScenario(title), onSuccess: async (scenario) => { await queryClient.invalidateQueries({ queryKey: ["scenarios"] }); navigate(`/scenarios/${scenario.id}`); } });
  return (
    <section className="stack">
      <header className="section-heading"><h1>Scenario Library</h1><Link className="button ghost" to="/import">Import</Link></header>
      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><input value={title} onChange={(event) => setTitle(event.target.value)} /><button>Create Scenario</button></form>
      <ScenarioList scenarios={scenarios.data?.items ?? []} />
    </section>
  );
}

/** Modular scenario editor for initial prompt modules and story cards. */
function ScenarioEditor() {
  const { scenarioId } = useParams();
  const queryClient = useQueryClient();
  const scenario = useQuery({ queryKey: ["scenario", scenarioId], queryFn: () => api.getScenario(scenarioId!) });
  const save = useMutation({ mutationFn: (payload: Partial<Scenario>) => api.updateScenario(scenarioId!, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const start = useMutation({ mutationFn: () => api.startAdventure(scenarioId!, scenario.data?.title), onSuccess: (adventure) => queryClient.invalidateQueries().then(() => location.assign(`/adventures/${adventure.id}`)) });
  if (!scenario.data) return <FullScreenMessage title="Loading scenario" />;
  /** Persist scenario metadata from the editor form. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate({ title: String(form.get("title")), description: String(form.get("description")), tags: String(form.get("tags")).split(",").map((tag) => tag.trim()).filter(Boolean) } as Partial<Scenario>);
  }
  return (
    <section className="stack">
      <header className="section-heading"><h1>{scenario.data.title}</h1><div><button onClick={() => start.mutate()}>Start Adventure</button><Link className="button ghost" to={`/scenarios/${scenarioId}/adventures`}>Adventures</Link></div></header>
      <form className="card stack" onSubmit={submit}>
        <label>Title<input name="title" defaultValue={scenario.data.title} /></label>
        <label>Description<textarea name="description" defaultValue={scenario.data.description} /></label>
        <label>Tags<input name="tags" defaultValue={scenario.data.tags.join(", ")} /></label>
        <button>Save Metadata</button>
      </form>
      <Panel title="Modules">{scenario.data.modules?.map((module) => <article className="subcard" key={module.id}><h3>{module.title}</h3><p>{module.content || "Empty module"}</p></article>)}</Panel>
      <Panel title="Story Cards"><CardList cards={scenario.data.cards ?? []} /></Panel>
    </section>
  );
}

/** Read-only card list used until detailed card editing is expanded. */
function CardList({ cards }: { cards: StoryCard[] }) {
  return <div className="list">{cards.map((card) => <div className="list-item" key={card.id}><strong>{card.title}</strong><span>{card.cardType} · {card.triggerWords.join(", ")}</span><p>{card.content}</p></div>)}</div>;
}

/** Scenario-specific adventure list including forks. */
function ScenarioAdventureList() {
  const { scenarioId } = useParams();
  const adventures = useQuery({ queryKey: ["scenarioAdventures", scenarioId], queryFn: () => api.listScenarioAdventures(scenarioId!) });
  return <Panel title="Adventures">{adventures.data?.items.map((adventure) => <Link className="list-item" key={adventure.id} to={`/adventures/${adventure.id}`}><strong>{adventure.title}</strong><span>{adventure.parentAdventureId ? "Fork" : "Root adventure"}</span></Link>)}</Panel>;
}

/** Main gameplay screen with story log, Do/Say/Story actions, model picker, and fork buttons. */
function Gameplay() {
  const { adventureId } = useParams();
  const queryClient = useQueryClient();
  const { actionType, setActionType, selectedModelId, setSelectedModelId } = useUiStore();
  const [content, setContent] = useState("");
  const adventure = useQuery({ queryKey: ["adventure", adventureId], queryFn: () => api.getAdventure(adventureId!) });
  const models = useQuery({ queryKey: ["availableModels"], queryFn: api.availableModels });
  const generate = useMutation({ mutationFn: () => api.generateTurn(adventureId!, actionType, content, selectedModelId), onSuccess: async () => { setContent(""); await queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }); } });
  const cont = useMutation({ mutationFn: () => api.continueTurn(adventureId!, selectedModelId), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }) });
  if (!adventure.data) return <FullScreenMessage title="Loading adventure" />;
  /** Submit the current player action to the story engine. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (content.trim()) generate.mutate();
  }
  return (
    <section className="gameplay">
      <header className="section-heading"><h1>{adventure.data.title}</h1><ModelPicker models={models.data?.items ?? []} value={selectedModelId} onChange={setSelectedModelId} /></header>
      <div className="story-log">{adventure.data.turns?.map((turn) => <TurnView key={turn.id} turn={turn} adventureId={adventureId!} />)}</div>
      <form className="composer" onSubmit={submit}>
        <div className="mode-row">{(["do", "say", "story"] as const).map((mode) => <button type="button" className={mode === actionType ? "active" : ""} key={mode} onClick={() => setActionType(mode)}>{mode}</button>)}</div>
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={`What do you ${actionType}?`} />
        <div className="mode-row"><button disabled={generate.isPending}>Submit</button><button type="button" className="ghost" disabled={cont.isPending} onClick={() => cont.mutate()}>Continue</button></div>
      </form>
    </section>
  );
}

/** Render one story turn with lightweight fork affordance. */
function TurnView({ turn, adventureId }: { turn: AdventureTurn; adventureId: string }) {
  const [forkTitle, setForkTitle] = useState("");
  const queryClient = useQueryClient();
  const fork = useMutation({ mutationFn: () => api.forkAdventure(adventureId, turn.id, forkTitle || `Fork from turn ${turn.sequence}`), onSuccess: () => queryClient.invalidateQueries() });
  return <article className={`turn ${turn.role} ${turn.isDeleted ? "deleted" : ""}`}><p className="eyebrow">{turn.role} · #{turn.sequence}</p><div>{turn.content}</div><div className="fork-row"><input placeholder="Fork title" value={forkTitle} onChange={(event) => setForkTitle(event.target.value)} /><button onClick={() => fork.mutate()}>Fork</button></div></article>;
}

/** Model picker showing merged personal/global available model configs. */
function ModelPicker({ models, value, onChange }: { models: ModelConfig[]; value: string | null; onChange: (value: string | null) => void }) {
  return <select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}><option value="">Default model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.displayName} ({model.ownerType})</option>)}</select>;
}

/** Provider settings for user-owned provider connections and write-only API keys. */
function ProviderSettings() {
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ["providers"], queryFn: api.listProviders });
  const create = useMutation({ mutationFn: (payload: Record<string, unknown>) => api.createProvider(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["providers"] }) });
  /** Create a provider connection from the settings form. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({ name: form.get("name"), providerType: form.get("providerType"), protocol: form.get("protocol"), baseUrl: form.get("baseUrl"), apiKey: form.get("apiKey") });
    event.currentTarget.reset();
  }
  return <section className="stack"><Panel title="Add Provider"><form className="stack" onSubmit={submit}><input name="name" placeholder="Display name" /><input name="providerType" placeholder="openrouter/openai/gemini/custom" /><input name="protocol" defaultValue="openai_chat_completions" /><input name="baseUrl" placeholder="Optional base URL" /><input name="apiKey" placeholder="Write-only API key" type="password" /><button>Add Provider</button></form></Panel><Panel title="Providers">{providers.data?.items.map((provider) => <ProviderRow key={provider.id} provider={provider} />)}</Panel></section>;
}

/** Display safe provider metadata without raw credential material. */
function ProviderRow({ provider }: { provider: ProviderConnection }) {
  return <div className="list-item"><strong>{provider.name}</strong><span>{provider.providerType} · {provider.hasCredential ? "credential configured" : "no credential"}</span></div>;
}

/** Model settings for user-owned model configs. */
function ModelSettings() {
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ["providers"], queryFn: api.listProviders });
  const models = useQuery({ queryKey: ["models"], queryFn: api.listModels });
  const create = useMutation({ mutationFn: (payload: Record<string, unknown>) => api.createModel(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] }) });
  /** Create a model config from the settings form. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({ providerConnectionId: form.get("providerConnectionId"), displayName: form.get("displayName"), modelId: form.get("modelId"), contextWindow: Number(form.get("contextWindow") || 32768), visibleResponseTargetTokens: Number(form.get("visibleResponseTargetTokens") || 350) });
  }
  return <section className="stack"><Panel title="Create Model"><form className="stack" onSubmit={submit}><select name="providerConnectionId">{providers.data?.items.map((provider) => <option value={provider.id} key={provider.id}>{provider.name}</option>)}</select><input name="displayName" placeholder="Display name" /><input name="modelId" placeholder="upstream model id" /><input name="contextWindow" type="number" defaultValue={32768} /><input name="visibleResponseTargetTokens" type="number" defaultValue={350} /><button>Create Model</button></form></Panel><Panel title="Models">{models.data?.items.map((model) => <div className="list-item" key={model.id}><strong>{model.displayName}</strong><span>{model.providerName} · {model.modelId}</span></div>)}</Panel></section>;
}

/** AID import preview/confirm flow with warning display. */
function ImportFlow() {
  const [raw, setRaw] = useState("{}");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const navigate = useNavigate();
  const previewMutation = useMutation({ mutationFn: () => api.previewAid(JSON.parse(raw)), onSuccess: setPreview });
  const confirm = useMutation({ mutationFn: () => api.confirmAid(preview!), onSuccess: (scenario) => navigate(`/scenarios/${scenario.id}`) });
  return <section className="stack"><Panel title="AID Import"><textarea className="json-input" value={raw} onChange={(event) => setRaw(event.target.value)} /><button onClick={() => previewMutation.mutate()}>Preview</button>{preview ? <div className="subcard"><h3>{preview.scenario.title}</h3>{preview.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}<p>{preview.scenario.cards.length} cards, {preview.scenario.modules.length} modules</p><button onClick={() => confirm.mutate()}>Confirm Import</button></div> : null}</Panel></section>;
}
