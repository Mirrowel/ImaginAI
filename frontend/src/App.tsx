import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, FormEvent, ReactNode, useState } from "react";
import { Link, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import * as api from "./api";
import type { AdventureStateEvent, AdventureTurn, ContextReport, GenerationVariant, ImportPreview, ModelConfig, ProviderConnection, Scenario, ScenarioModule, StoryCard } from "./types";
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
  const me = useQuery({ queryKey: ["me"], queryFn: api.getMe });
  const { sidebarSize } = useUiStore();
  const logoutMutation = useMutation({
    mutationFn: api.logout,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["me"] });
      navigate("/login");
    },
  });
  return (
    <div className={`app-shell ${sidebarSize === "compact" ? "sidebar-compact" : ""}`}>
      <aside className="nav-panel">
        <Link className="brand" to="/">ImaginAI</Link>
        <Link to="/scenarios">Scenarios</Link>
        <Link to="/providers">Providers</Link>
        <Link to="/models">Models</Link>
        {me.data?.user?.isAdmin ? <Link to="/admin">Admin</Link> : null}
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
          <Route path="/admin" element={<AdminSettings />} />
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
  const [adventurePage, setAdventurePage] = useState(1);
  const scenarios = useQuery({ queryKey: ["scenarios"], queryFn: () => api.listScenarios() });
  const adventures = useQuery({ queryKey: ["adventures", adventurePage], queryFn: () => api.listAdventures(adventurePage) });
  const models = useQuery({ queryKey: ["availableModels"], queryFn: () => api.availableModels() });
  const { textStreamingEnabled, setTextStreamingEnabled, debugPanelsDefaultOpen, setDebugPanelsDefaultOpen, streamThinking, setStreamThinking, theme, setTheme, sidebarSize, setSidebarSize, showThinkingDefault, setShowThinkingDefault, editorLayout, setEditorLayout } = useUiStore();
  return (
    <section className="stack">
      <header className="hero"><p className="eyebrow">Story sandbox</p><h1>Build worlds, fork adventures, and steer the model.</h1></header>
      {models.data?.total === 0 ? <div className="notice">No enabled models yet. Add a provider and model config before live AI generation, or enable fake LLM mode for local tests.</div> : null}
      <div className="grid two">
        <Panel title="Recent Scenarios"><ScenarioList scenarios={scenarios.data?.items ?? []} /></Panel>
        <Panel title="Recent Adventures"><div className="list">{adventures.data?.items.map((adventure) => <Link className="list-item" key={adventure.id} to={`/adventures/${adventure.id}`}><strong>{adventure.title}</strong><span>{adventure.parentAdventureId ? "Fork" : "Root"} · {adventure.status}</span></Link>)}{adventures.data?.items[0] ? <Link className="button" to={`/adventures/${adventures.data.items[0].id}`}>Quick Continue</Link> : <p className="muted">No adventures yet.</p>}</div><PageInfo total={adventures.data?.total ?? 0} shown={adventures.data?.items?.length ?? 0} hasMore={adventures.data?.hasMore} onLoadMore={() => setAdventurePage((p) => p + 1)} /></Panel>
        <Panel title="Quick Actions"><Link className="button" to="/scenarios">Create or edit scenarios</Link><Link className="button ghost" to="/import">Import AID scenario</Link></Panel>
      </div>
      <Panel title="Local Preferences"><div className="stack">
        <div className="mode-row"><label className="checkbox"><input type="checkbox" checked={textStreamingEnabled} onChange={(event) => setTextStreamingEnabled(event.target.checked)} /> Text streaming</label><label className="checkbox"><input type="checkbox" checked={streamThinking} onChange={(event) => setStreamThinking(event.target.checked)} /> Stream thinking</label><label className="checkbox"><input type="checkbox" checked={debugPanelsDefaultOpen} onChange={(event) => setDebugPanelsDefaultOpen(event.target.checked)} /> Debug panels open</label><label className="checkbox"><input type="checkbox" checked={showThinkingDefault} onChange={(event) => setShowThinkingDefault(event.target.checked)} /> Show thinking</label></div>
        <div className="mode-row"><label>Theme<select value={theme} onChange={(event) => setTheme(event.target.value as "dark" | "system")}><option value="dark">Dark</option><option value="system">System</option></select></label><label>Sidebar<select value={sidebarSize} onChange={(event) => setSidebarSize(event.target.value as "compact" | "comfortable")}><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label><label>Editor layout<select value={editorLayout} onChange={(event) => setEditorLayout(event.target.value as "stacked" | "split")}><option value="stacked">Stacked</option><option value="split">Split</option></select></label></div>
      </div></Panel>
    </section>
  );
}

/** Reusable titled panel for app sections. */
function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card"><h2>{title}</h2>{children}</section>;
}

/** Download safe JSON exports without sending them through any provider path. */
function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
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

/** Scenario library with create/import/edit/adventure entry points and load-more pagination. */
function ScenarioLibrary() {
  const [title, setTitle] = useState("Untitled Scenario");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const scenarios = useQuery({ queryKey: ["scenarios", page], queryFn: () => api.listScenarios(page) });
  const create = useMutation({ mutationFn: () => api.createScenario(title), onSuccess: async (scenario) => { await queryClient.invalidateQueries({ queryKey: ["scenarios"] }); navigate(`/scenarios/${scenario.id}`); } });
  const allItems = scenarios.data?.items ?? [];
  const filtered = search ? allItems.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()) || s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) : allItems;
  return (
    <section className="stack">
      <header className="section-heading"><h1>Scenario Library</h1><Link className="button ghost" to="/import">Import</Link></header>
      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><input value={title} onChange={(event) => setTitle(event.target.value)} /><button>Create Scenario</button></form>
      <input className="search-input" placeholder="Search scenarios by title, description, or tag…" value={search} onChange={(event) => setSearch(event.target.value)} />
      <ScenarioList scenarios={filtered} />
      <PageInfo total={scenarios.data?.total ?? 0} shown={filtered.length} hasMore={scenarios.data?.hasMore} onLoadMore={() => setPage((p) => p + 1)} />
    </section>
  );
}

/** Modular scenario editor for initial prompt modules and story cards. */
function ScenarioEditor() {
  const { scenarioId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { editorLayout } = useUiStore();
  const scenario = useQuery({ queryKey: ["scenario", scenarioId], queryFn: () => api.getScenario(scenarioId!) });
  const versions = useQuery({ queryKey: ["scenarioVersions", scenarioId], queryFn: () => api.listScenarioVersions(scenarioId!) });
  const models = useQuery({ queryKey: ["availableModels"], queryFn: () => api.availableModels() });
  const save = useMutation({ mutationFn: (payload: Partial<Scenario>) => api.updateScenario(scenarioId!, payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const start = useMutation({ mutationFn: () => api.startAdventure(scenarioId!, scenario.data?.title), onSuccess: (adventure) => queryClient.invalidateQueries().then(() => location.assign(`/adventures/${adventure.id}`)) });
  const duplicate = useMutation({ mutationFn: () => api.duplicateScenario(scenarioId!, `${scenario.data?.title} Copy`), onSuccess: (copy) => navigate(`/scenarios/${copy.id}`) });
  const freeze = useMutation({ mutationFn: () => api.freezeScenario(scenarioId!), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarioVersions", scenarioId] }) });
  const remove = useMutation({ mutationFn: () => api.deleteScenario(scenarioId!), onSuccess: () => navigate("/scenarios") });
  const exportScenario = useMutation({ mutationFn: () => api.exportScenario(scenarioId!), onSuccess: (data) => downloadJson(`${scenario.data?.title || "scenario"}.imaginai.json`, data) });
  const addModule = useMutation({ mutationFn: () => api.createScenarioModule(scenarioId!, { title: "New Module", moduleType: "custom", content: "" }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  if (!scenario.data) return <FullScreenMessage title="Loading scenario" />;
  /** Persist scenario metadata from the editor form. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const defaultModelConfigId = String(form.get("defaultModelConfigId") || "");
    save.mutate({ title: String(form.get("title")), description: String(form.get("description")), tags: String(form.get("tags")).split(",").map((tag) => tag.trim()).filter(Boolean), defaultModelConfigId: defaultModelConfigId || null } as Partial<Scenario>);
  }
  const layoutClass = editorLayout === "split" ? "editor-split" : "stack";
  return (
    <section className="stack">
      <header className="section-heading"><h1>{scenario.data.title}</h1><div className="mode-row"><button onClick={() => start.mutate()}>Start Adventure</button><button className="ghost" onClick={() => duplicate.mutate()}>Duplicate</button><button className="ghost" onClick={() => freeze.mutate()}>Freeze Version</button><button className="ghost" onClick={() => exportScenario.mutate()}>Export</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button><Link className="button ghost" to={`/scenarios/${scenarioId}/adventures`}>Adventures</Link></div></header>
      <form className="card stack" onSubmit={submit}>
        <label>Title<input name="title" defaultValue={scenario.data.title} /></label>
        <label>Description<textarea name="description" defaultValue={scenario.data.description} /></label>
        <label>Tags<input name="tags" defaultValue={scenario.data.tags.join(", ")} /></label>
        <label>Default Model<select name="defaultModelConfigId" defaultValue={scenario.data.defaultModelConfigId ?? ""}><option value="">No default (use user preference)</option>{models.data?.items.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}</select></label>
        <button>Save Metadata</button>
      </form>
      <Panel title="Versions"><div className="list">{versions.data?.items.map((version) => <div className="list-item" key={version.id}><strong>v{version.versionNumber}: {version.title}</strong><span>{version.changeNote || "No note"} · {version.createdAt}</span></div>)}</div></Panel>
      <div className={layoutClass}>
        <Panel title="Modules"><button className="ghost" onClick={() => addModule.mutate()}>Add Module</button>{scenario.data.modules?.map((module, index) => <ModuleEditor key={module.id} module={module} modules={scenario.data.modules ?? []} index={index} scenarioId={scenarioId!} />)}</Panel>
        <Panel title="Story Cards"><ScenarioCardEditor scenarioId={scenarioId!} cards={scenario.data.cards ?? []} /></Panel>
      </div>
    </section>
  );
}

/** Inline editor for one scenario draft module. */
function ModuleEditor({ module, modules, index, scenarioId }: { module: ScenarioModule; modules: ScenarioModule[]; index: number; scenarioId: string }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(module.title);
  const [content, setContent] = useState(module.content);
  const [settingsRaw, setSettingsRaw] = useState(JSON.stringify(module.settings ?? {}, null, 2));
  const save = useMutation({ mutationFn: () => api.updateScenarioModule(module.id, { title, content, settings: parseJsonObject(settingsRaw) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const remove = useMutation({ mutationFn: () => api.deleteScenarioModule(module.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const toggleEnabled = useMutation({ mutationFn: () => api.updateScenarioModule(module.id, { isEnabled: !module.isEnabled }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const reorder = useMutation({ mutationFn: (direction: -1 | 1) => api.reorderScenarioModules(scenarioId, moveId(modules.map((item) => item.id), index, direction)), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  return <article className={`subcard stack ${module.isEnabled ? "" : "module-disabled"}`}><input value={title} onChange={(event) => setTitle(event.target.value)} /><textarea value={content} onChange={(event) => setContent(event.target.value)} /><label>Settings JSON<textarea className="json-input-sm" value={settingsRaw} onChange={(event) => setSettingsRaw(event.target.value)} /></label><div className="mode-row"><button onClick={() => save.mutate()} disabled={save.isPending}>Save Module</button><button className="ghost" onClick={() => toggleEnabled.mutate()}>{module.isEnabled ? "Disable" : "Enable"}</button><button className="ghost" disabled={index === 0} onClick={() => reorder.mutate(-1)}>Up</button><button className="ghost" disabled={index === modules.length - 1} onClick={() => reorder.mutate(1)}>Down</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div></article>;
}

/** Move an id one slot for simple reorder controls. */
function moveId(ids: string[], index: number, direction: -1 | 1): string[] {
  const next = [...ids];
  const target = index + direction;
  if (target < 0 || target >= ids.length) return ids;
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** Story-card editor for draft scenario cards plus simple card creation. */
function ScenarioCardEditor({ scenarioId, cards }: { scenarioId: string; cards: StoryCard[] }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("New Card");
  const [importRaw, setImportRaw] = useState("[]");
  const create = useMutation({ mutationFn: () => api.createScenarioCard(scenarioId, { title, cardType: "concept", activationMode: "triggered", triggerWords: [] }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const importCards = useMutation({ mutationFn: () => api.importScenarioCards(scenarioId, JSON.parse(importRaw), false), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const exportCards = useMutation({ mutationFn: () => api.exportScenarioCards(scenarioId), onSuccess: (data) => downloadJson("story-cards.aid.json", data.cards) });
  return <div className="stack"><form className="inline-form" onSubmit={(event) => { event.preventDefault(); create.mutate(); }}><input value={title} onChange={(event) => setTitle(event.target.value)} /><button>Add Card</button><button type="button" className="ghost" onClick={() => exportCards.mutate()}>Export Cards</button></form><details className="subcard"><summary>Import Cards</summary><textarea value={importRaw} onChange={(event) => setImportRaw(event.target.value)} /><button onClick={() => importCards.mutate()}>Import Cards</button></details>{cards.map((card, index) => <CardEditor key={card.id} card={card} scenarioId={scenarioId} cards={cards} index={index} />)}</div>;
}

/** Inline editor for an AID-compatible story card. */
function CardEditor({ card, scenarioId, cards, index }: { card: StoryCard; scenarioId: string; cards: StoryCard[]; index: number }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(card);
  const [metadataRaw, setMetadataRaw] = useState(JSON.stringify(card.metadata ?? {}, null, 2));
  const save = useMutation({ mutationFn: () => api.updateScenarioCard(card.id, { ...draft, metadata: parseJsonObject(metadataRaw) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const remove = useMutation({ mutationFn: () => api.deleteScenarioCard(card.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  const reorder = useMutation({ mutationFn: (direction: -1 | 1) => api.reorderScenarioCards(scenarioId, moveId(cards.map((item) => item.id), index, direction)), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenario", scenarioId] }) });
  return <article className="subcard stack">
    <div className="mode-row"><label className="checkbox"><input type="checkbox" checked={draft.isEnabled} onChange={(event) => setDraft({ ...draft, isEnabled: event.target.checked })} /> Enabled</label><label className="checkbox"><input type="checkbox" checked={draft.useForCharacterCreation} onChange={(event) => setDraft({ ...draft, useForCharacterCreation: event.target.checked })} /> Character creation</label></div>
    <label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
    <label>Type<input value={draft.cardType} onChange={(event) => setDraft({ ...draft, cardType: event.target.value })} /></label>
    <label>Summary<input value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
    <label>Activation Mode<select value={draft.activationMode} onChange={(event) => setDraft({ ...draft, activationMode: event.target.value as StoryCard["activationMode"] })}><option value="always">Always</option><option value="triggered">Triggered</option><option value="manual">Manual</option><option value="disabled">Disabled</option></select></label>
    <label>Priority<input type="number" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} /></label>
    <label>Token Budget<input type="number" placeholder="No budget" value={draft.tokenBudget ?? ""} onChange={(event) => setDraft({ ...draft, tokenBudget: event.target.value ? Number(event.target.value) : null })} /></label>
    <label>Trigger Words<input value={draft.triggerWords.join(", ")} onChange={(event) => setDraft({ ...draft, triggerWords: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
    <label>Content<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
    <label>Metadata JSON<textarea className="json-input-sm" value={metadataRaw} onChange={(event) => setMetadataRaw(event.target.value)} /></label>
    <div className="mode-row"><button onClick={() => save.mutate()} disabled={save.isPending}>Save Card</button><button className="ghost" disabled={index === 0} onClick={() => reorder.mutate(-1)}>Up</button><button className="ghost" disabled={index === cards.length - 1} onClick={() => reorder.mutate(1)}>Down</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div>
  </article>;
}

/** Scenario-specific adventure list with start, continue, archive, and delete actions. */
function ScenarioAdventureList() {
  const { scenarioId } = useParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const adventures = useQuery({ queryKey: ["scenarioAdventures", scenarioId, page], queryFn: () => api.listScenarioAdventures(scenarioId!, page) });
  const scenario = useQuery({ queryKey: ["scenario", scenarioId], queryFn: () => api.getScenario(scenarioId!) });
  const startNew = useMutation({ mutationFn: () => api.startAdventure(scenarioId!, scenario.data?.title), onSuccess: (adventure) => { queryClient.invalidateQueries({ queryKey: ["scenarioAdventures", scenarioId] }); navigate(`/adventures/${adventure.id}`); } });
  const archive = useMutation({ mutationFn: (id: string) => api.archiveAdventure(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarioAdventures", scenarioId] }) });
  const remove = useMutation({ mutationFn: (id: string) => api.deleteAdventure(id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["scenarioAdventures", scenarioId] }) });
  const items = adventures.data?.items ?? [];
  const activeAdventures = items.filter((a) => a.status === "active");
  const lastActive = activeAdventures[0];
  return <section className="stack">
    <header className="section-heading"><h1>Adventures</h1><div className="mode-row"><button onClick={() => startNew.mutate()} disabled={startNew.isPending}>Start New Adventure</button>{lastActive ? <Link className="button ghost" to={`/adventures/${lastActive.id}`}>Continue: {lastActive.title}</Link> : null}</div></header>
    <div className="list">{items.map((adventure) => (
      <div className="list-item" key={adventure.id}>
        <div className="adventure-row-header"><Link to={`/adventures/${adventure.id}`}><strong>{adventure.title}</strong></Link><span className={`tag ${adventure.status === "active" ? "" : "warning"}`}>{adventure.status}</span></div>
        <span className="muted">{adventure.parentAdventureId ? "Fork" : "Root adventure"}{adventure.parentAdventureId ? ` · parent ${adventure.parentAdventureId.slice(0, 8)}…` : ""}</span>
        <div className="mode-row"><Link className="button ghost" to={`/adventures/${adventure.id}`}>{adventure.status === "active" ? "Continue" : "View"}</Link>{adventure.status === "active" ? <button className="ghost" onClick={() => archive.mutate(adventure.id)} disabled={archive.isPending}>Archive</button> : null}{adventure.status !== "deleted" ? <button className="ghost" onClick={() => remove.mutate(adventure.id)} disabled={remove.isPending}>Delete</button> : null}</div>
      </div>
    ))}{items.length === 0 ? <p className="muted">No adventures yet for this scenario.</p> : null}</div>
    <PageInfo total={adventures.data?.total ?? 0} shown={items.length} hasMore={adventures.data?.hasMore} onLoadMore={() => setPage((p) => p + 1)} />
  </section>;
}

/** Main gameplay screen with story log, Do/Say/Story actions, model picker, and fork buttons. */
function Gameplay() {
  const { adventureId } = useParams();
  const queryClient = useQueryClient();
  const { actionType, setActionType, selectedModelId, setSelectedModelId, textStreamingEnabled, streamThinking, showThinkingDefault } = useUiStore();
  const [content, setContent] = useState("");
  const [streamText, setStreamText] = useState("");
  const [streamThinkingText, setStreamThinkingText] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [showThinking, setShowThinking] = useState(showThinkingDefault);
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [quickContextLimit, setQuickContextLimit] = useState("");
  const [quickTargetTokens, setQuickTargetTokens] = useState("");
  const [quickTemperature, setQuickTemperature] = useState("");
  const [quickTopP, setQuickTopP] = useState("");
  const [quickThinkingEnabled, setQuickThinkingEnabled] = useState(false);
  const [quickShowThinking, setQuickShowThinking] = useState(false);
  const adventure = useQuery({ queryKey: ["adventure", adventureId], queryFn: () => api.getAdventure(adventureId!) });
  const models = useQuery({ queryKey: ["availableModels"], queryFn: () => api.availableModels() });
  /** Build the per-request generation settings override from quick controls. */
  function buildGenerationSettings(): Record<string, unknown> | undefined {
    const settings: Record<string, unknown> = {};
    if (quickContextLimit) settings.contextLimit = Number(quickContextLimit);
    if (quickTargetTokens) settings.visibleTargetTokens = Number(quickTargetTokens);
    if (quickTemperature) settings.temperature = Number(quickTemperature);
    if (quickTopP) settings.topP = Number(quickTopP);
    if (quickThinkingEnabled) settings.thinkingEnabled = true;
    if (quickShowThinking) settings.showThinking = true;
    return Object.keys(settings).length > 0 ? settings : undefined;
  }
  const generationSettings = buildGenerationSettings();
  const generate = useMutation({ mutationFn: async () => { setStreamThinkingText(""); setStreamText(""); setStreamStatus(""); return textStreamingEnabled ? api.streamGenerateTurn(adventureId!, actionType, content, selectedModelId, handleGenerationEvent, generationSettings) : api.generateTurn(adventureId!, actionType, content, selectedModelId, generationSettings); }, onSuccess: async () => { setContent(""); await queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }); } });
  const cont = useMutation({ mutationFn: async () => { setStreamThinkingText(""); setStreamText(""); setStreamStatus(""); return textStreamingEnabled ? api.streamContinueTurn(adventureId!, selectedModelId, handleGenerationEvent, generationSettings) : api.continueTurn(adventureId!, selectedModelId, generationSettings); }, onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }); } });
  if (!adventure.data) return <FullScreenMessage title="Loading adventure" />;
  const isGenerating = generate.isPending || cont.isPending;
  /** Apply normalized generation stream events to local gameplay UI state. */
  function handleGenerationEvent(event: import("./types").GenerationEvent) {
    if (event.type === "generation.status") setStreamStatus(`${event.phase}: ${event.message}`);
    if (event.type === "generation.content_delta") setStreamText((current) => current + event.text);
    if (event.type === "generation.thinking_delta") {
      if (streamThinking) setStreamThinkingText((current) => current + event.text);
      if (quickShowThinking || showThinkingDefault) setShowThinking(true);
    }
    if (event.type === "generation.final") setStreamText(event.content);
    if (event.type === "generation.error") setStreamStatus(event.message);
  }
  /** Submit the current player action to the story engine. */
  function submit(event: FormEvent) {
    event.preventDefault();
    if (content.trim()) generate.mutate();
  }
  return (
    <section className="gameplay">
      <header className="section-heading"><h1>{adventure.data.title}</h1><ModelPicker models={models.data?.items ?? []} value={selectedModelId} onChange={setSelectedModelId} /></header>
      <div className="story-log">{adventure.data.turns?.map((turn) => <TurnView key={turn.id} turn={turn} adventureId={adventureId!} selectedModelId={selectedModelId} onGenerationEvent={handleGenerationEvent} generationSettings={generationSettings} />)}{streamThinkingText && showThinking ? <details className="turn assistant thinking-panel" open><summary className="eyebrow">Thinking</summary><div className="thinking-content">{streamThinkingText}</div></details> : null}{streamText ? <article className="turn assistant streaming"><p className="eyebrow">Streaming · {streamStatus}</p><div>{streamText}</div></article> : null}</div>
      <form className="composer" onSubmit={submit}>
        <div className="mode-row">{(["do", "say", "story"] as const).map((mode) => <button type="button" className={mode === actionType ? "active" : ""} key={mode} onClick={() => setActionType(mode)}>{mode}</button>)}<button type="button" className={`ghost${showQuickSettings ? " active" : ""}`} onClick={() => setShowQuickSettings((v) => !v)}>Settings</button></div>
        {showQuickSettings ? <div className="quick-settings">
          <label>Context limit<input type="number" placeholder="default" value={quickContextLimit} onChange={(event) => setQuickContextLimit(event.target.value)} /></label>
          <label>Target tokens<input type="number" placeholder="default" value={quickTargetTokens} onChange={(event) => setQuickTargetTokens(event.target.value)} /></label>
          <label>Temperature<input type="number" step="0.1" placeholder="default" value={quickTemperature} onChange={(event) => setQuickTemperature(event.target.value)} /></label>
          <label>Top P<input type="number" step="0.01" placeholder="default" value={quickTopP} onChange={(event) => setQuickTopP(event.target.value)} /></label>
          <label className="checkbox"><input type="checkbox" checked={quickThinkingEnabled} onChange={(event) => setQuickThinkingEnabled(event.target.checked)} /> Thinking</label>
          <label className="checkbox"><input type="checkbox" checked={quickShowThinking} onChange={(event) => setQuickShowThinking(event.target.checked)} /> Show thinking</label>
        </div> : null}
        <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={`What do you ${actionType}?`} />
        <div className="mode-row"><button disabled={isGenerating}>Submit</button><button type="button" className="ghost" disabled={isGenerating} onClick={() => cont.mutate()}>Continue</button></div>
        {streamStatus ? <p className="muted">{streamStatus}</p> : null}
      </form>
      <AdventureStatePanel adventure={adventure.data} models={models.data?.items ?? []} />
      <AdventureMemoryPanel adventureId={adventureId!} />
    </section>
  );
}

/** Adventure-local module and model override editor backed by state events. */
function AdventureStatePanel({ adventure, models }: { adventure: import("./types").Adventure; models: ModelConfig[] }) {
  const queryClient = useQueryClient();
  const [selectedModel, setSelectedModel] = useState(adventure.currentModelConfigId ?? adventure.state?.currentModelConfigId ?? "");
  const [temperature, setTemperature] = useState(String(adventure.state?.generationSettings?.temperature ?? ""));
  const [contextLimit, setContextLimit] = useState(String(adventure.state?.generationSettings?.contextLimit ?? ""));
  const [visibleTargetTokens, setVisibleTargetTokens] = useState(String(adventure.state?.generationSettings?.visibleTargetTokens ?? ""));
  const modelMutation = useMutation({ mutationFn: () => api.updateAdventureModel(adventure.id, selectedModel || null), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventure.id] }) });
  const settingsMutation = useMutation({ mutationFn: () => api.updateAdventureGenerationSettings(adventure.id, { temperature: temperature ? Number(temperature) : undefined, contextLimit: contextLimit ? Number(contextLimit) : undefined, visibleTargetTokens: visibleTargetTokens ? Number(visibleTargetTokens) : undefined }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventure.id] }) });
  const addCard = useMutation({ mutationFn: () => api.createAdventureCard(adventure.id, { title: "Adventure Detail", cardType: "concept", content: "", activationMode: "manual", triggerWords: [] }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventure.id] }) });
  return <details className="card"><summary>Adventure State</summary><div className="stack"><label>Adventure Model Override<select value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)}><option value="">Scenario/default model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}</select></label><button onClick={() => modelMutation.mutate()}>Save Model Override</button><div className="subcard stack"><h3>Generation Settings</h3><input placeholder="Temperature override" value={temperature} onChange={(event) => setTemperature(event.target.value)} /><input placeholder="Context limit override" value={contextLimit} onChange={(event) => setContextLimit(event.target.value)} /><input placeholder="Visible target tokens" value={visibleTargetTokens} onChange={(event) => setVisibleTargetTokens(event.target.value)} /><button onClick={() => settingsMutation.mutate()}>Save Generation Settings</button></div><h3>Modules</h3><div className="list">{adventure.state?.modules.map((module) => <AdventureModuleEditor key={module.id} adventureId={adventure.id} module={module} />)}</div><h3>Adventure Cards</h3><button className="ghost" onClick={() => addCard.mutate()}>Add Adventure Card</button><div className="list">{adventure.state?.cards.map((card, index, cards) => <AdventureCardEditor key={card.id} adventureId={adventure.id} card={card} cards={cards} index={index} />)}</div><AdventureStateEventList adventureId={adventure.id} /></div></details>;
}

/** Inline editor for modules that have diverged in an adventure fork/state timeline. */
function AdventureModuleEditor({ adventureId, module }: { adventureId: string; module: ScenarioModule }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState(module.content);
  const save = useMutation({ mutationFn: () => api.updateAdventureModule(adventureId, module.id, { ...module, content }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }) });
  return <article className="subcard stack"><strong>{module.title}</strong><textarea value={content} onChange={(event) => setContent(event.target.value)} /><button onClick={() => save.mutate()}>Save Adventure Module</button></article>;
}

/** Adventure-local story card editor that records card changes as state events. */
function AdventureCardEditor({ adventureId, card, cards, index }: { adventureId: string; card: StoryCard; cards: StoryCard[]; index: number }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState(card);
  const [metadataRaw, setMetadataRaw] = useState(JSON.stringify(card.metadata ?? {}, null, 2));
  const save = useMutation({ mutationFn: () => api.updateAdventureCard(adventureId, card.id, { ...draft, metadata: parseJsonObject(metadataRaw) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }) });
  const remove = useMutation({ mutationFn: () => api.deleteAdventureCard(adventureId, card.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }) });
  const reorder = useMutation({ mutationFn: (direction: -1 | 1) => api.reorderAdventureCards(adventureId, moveId(cards.map((item) => item.id), index, direction)), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adventure", adventureId] }) });
  return <article className="subcard stack">
    <div className="mode-row"><label className="checkbox"><input type="checkbox" checked={draft.isEnabled} onChange={(event) => setDraft({ ...draft, isEnabled: event.target.checked })} /> Enabled</label><label className="checkbox"><input type="checkbox" checked={draft.useForCharacterCreation} onChange={(event) => setDraft({ ...draft, useForCharacterCreation: event.target.checked })} /> Character creation</label></div>
    <label>Title<input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} /></label>
    <label>Type<input value={draft.cardType} onChange={(event) => setDraft({ ...draft, cardType: event.target.value })} /></label>
    <label>Summary<input value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} /></label>
    <label>Activation Mode<select value={draft.activationMode} onChange={(event) => setDraft({ ...draft, activationMode: event.target.value as StoryCard["activationMode"] })}><option value="always">Always</option><option value="triggered">Triggered</option><option value="manual">Manual</option><option value="disabled">Disabled</option></select></label>
    <label>Priority<input type="number" value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: Number(event.target.value) })} /></label>
    <label>Token Budget<input type="number" placeholder="No budget" value={draft.tokenBudget ?? ""} onChange={(event) => setDraft({ ...draft, tokenBudget: event.target.value ? Number(event.target.value) : null })} /></label>
    <label>Trigger Words<input value={draft.triggerWords.join(", ")} onChange={(event) => setDraft({ ...draft, triggerWords: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} /></label>
    <label>Content<textarea value={draft.content} onChange={(event) => setDraft({ ...draft, content: event.target.value })} /></label>
    <label>Metadata JSON<textarea className="json-input-sm" value={metadataRaw} onChange={(event) => setMetadataRaw(event.target.value)} /></label>
    <div className="mode-row"><button onClick={() => save.mutate()} disabled={save.isPending}>Save Adventure Card</button><button className="ghost" disabled={index === 0} onClick={() => reorder.mutate(-1)}>Up</button><button className="ghost" disabled={index === cards.length - 1} onClick={() => reorder.mutate(1)}>Down</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div>
  </article>;
}

/** Collapsed state-events audit panel for debug inspection. */
function AdventureStateEventList({ adventureId }: { adventureId: string }) {
  const events = useQuery({ queryKey: ["stateEvents", adventureId], queryFn: () => api.listStateEvents(adventureId) });
  return <details className="subcard"><summary>State Events ({events.data?.total ?? "…"})</summary><div className="stack">{events.data?.items.length ? events.data.items.map((event: AdventureStateEvent) => <div className="list-item" key={event.id}><div className="adventure-row-header"><strong>{event.eventType}</strong><span className={`tag ${event.isInvalidated ? "warning" : ""}`}>{event.targetType}{event.isInvalidated ? " · invalidated" : ""}</span></div><span className="muted">seq {event.stateSequence} · tl {event.timelineSequence} · {event.targetId ? `${event.targetId.slice(0, 8)}…` : "no target"} · {event.createdAt}</span></div>) : <p className="muted">No state events recorded.</p>}</div></details>;
}

/** Manual summary and pinned-memory panel for the future memory worker seam. */
function AdventureMemoryPanel({ adventureId }: { adventureId: string }) {
  const queryClient = useQueryClient();
  const summary = useQuery({ queryKey: ["summary", adventureId], queryFn: () => api.getSummary(adventureId) });
  const memories = useQuery({ queryKey: ["memories", adventureId], queryFn: () => api.listMemories(adventureId) });
  const [summaryText, setSummaryText] = useState("");
  const [memoryTitle, setMemoryTitle] = useState("Pinned detail");
  const [memoryContent, setMemoryContent] = useState("");
  const saveSummary = useMutation({ mutationFn: () => api.updateSummary(adventureId, summaryText), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["summary", adventureId] }) });
  const createMemory = useMutation({ mutationFn: () => api.createMemory(adventureId, { title: memoryTitle, content: memoryContent, isPinned: true }), onSuccess: async () => { setMemoryContent(""); await queryClient.invalidateQueries({ queryKey: ["memories", adventureId] }); } });
  /** Initialize editable summary text from server state once loaded. */
  function syncSummary(): string {
    if (!summaryText && summary.data?.content) return summary.data.content;
    return summaryText;
  }
  return <details className="card"><summary>Memory And Summary</summary><div className="stack"><label>Rough Summary<textarea value={syncSummary()} onChange={(event) => setSummaryText(event.target.value)} /></label><button onClick={() => saveSummary.mutate()}>Save Summary</button><form className="stack" onSubmit={(event) => { event.preventDefault(); createMemory.mutate(); }}><input value={memoryTitle} onChange={(event) => setMemoryTitle(event.target.value)} /><textarea placeholder="Precise memory to pin" value={memoryContent} onChange={(event) => setMemoryContent(event.target.value)} /><button>Add Pinned Memory</button></form><div className="list">{memories.data?.items.map((memory) => <div className="list-item" key={memory.id}><strong>{memory.title}</strong><span>{memory.scope} · {memory.isPinned ? "pinned" : "dynamic"}</span><p>{memory.content}</p></div>)}</div></div></details>;
}

/** Render one story turn with fork, retry variant, edit, delete, restore, and inspect affordances. */
function TurnView({ turn, adventureId, selectedModelId, onGenerationEvent, generationSettings }: { turn: AdventureTurn; adventureId: string; selectedModelId: string | null; onGenerationEvent: (event: import("./types").GenerationEvent) => void; generationSettings?: Record<string, unknown> }) {
  const navigate = useNavigate();
  const [forkTitle, setForkTitle] = useState("");
  const [forkNote, setForkNote] = useState("");
  const [switchToFork, setSwitchToFork] = useState(true);
  const [retryInstruction, setRetryInstruction] = useState("");
  const [includeVariantIds, setIncludeVariantIds] = useState<string[]>([]);
  const [showInspect, setShowInspect] = useState(false);
  const [deleteMode, setDeleteMode] = useState<"from_here" | "single">("from_here");
  const [revertState, setRevertState] = useState(false);
  const [editContent, setEditContent] = useState(turn.content);
  const queryClient = useQueryClient();
  const fork = useMutation({ mutationFn: () => api.forkAdventure(adventureId, turn.id, forkTitle || `Fork from turn ${turn.sequence}`, forkNote, switchToFork), onSuccess: async (forked) => { await queryClient.invalidateQueries(); if (forked.switchToFork) navigate(`/adventures/${forked.id}`); } });
  const retry = useMutation({ mutationFn: () => api.streamRetryTurn(adventureId, turn.responseGroupId!, retryInstruction, selectedModelId, includeVariantIds, onGenerationEvent, generationSettings), onSuccess: () => queryClient.invalidateQueries() });
  const saveTurn = useMutation({ mutationFn: () => api.api(`/adventures/${adventureId}/turns/${turn.id}`, { method: "PATCH", body: JSON.stringify({ content: editContent }) }), onSuccess: () => queryClient.invalidateQueries() });
  const deleteTurn = useMutation({ mutationFn: () => api.api(`/adventures/${adventureId}/turns/${turn.id}`, { method: "DELETE", body: JSON.stringify({ mode: deleteMode, revertStateChangesAfterPoint: revertState }) }), onSuccess: () => queryClient.invalidateQueries() });
  const restoreTurn = useMutation({ mutationFn: () => api.api(`/adventures/${adventureId}/turns/${turn.id}/restore`, { method: "POST", body: JSON.stringify({ mode: deleteMode, restoreStateChangesAfterPoint: revertState }) }), onSuccess: () => queryClient.invalidateQueries() });
  return <article className={`turn ${turn.role} ${turn.isDeleted ? "deleted" : ""}`}><p className="eyebrow">{turn.role} · #{turn.sequence}</p><textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} /><div className="mode-row"><button onClick={() => saveTurn.mutate()}>Save Turn</button><select value={deleteMode} onChange={(event) => setDeleteMode(event.target.value as "from_here" | "single")}><option value="from_here">From here</option><option value="single">Single turn</option></select><label className="checkbox"><input type="checkbox" checked={revertState} onChange={(event) => setRevertState(event.target.checked)} /> Revert later state</label><button className="ghost" onClick={() => turn.isDeleted ? restoreTurn.mutate() : deleteTurn.mutate()}>{turn.isDeleted ? "Restore" : "Delete"}</button><button className="ghost" onClick={() => setShowInspect((value) => !value)}>Inspect</button></div><div className="fork-row"><input placeholder="Fork title" value={forkTitle} onChange={(event) => setForkTitle(event.target.value)} /><input placeholder="Fork note" value={forkNote} onChange={(event) => setForkNote(event.target.value)} /><label className="checkbox"><input type="checkbox" checked={switchToFork} onChange={(event) => setSwitchToFork(event.target.checked)} /> Switch</label><button onClick={() => fork.mutate()}>Fork</button></div>{turn.responseGroupId ? <div className="retry-box"><input placeholder="Retry guidance" value={retryInstruction} onChange={(event) => setRetryInstruction(event.target.value)} /><button onClick={() => retry.mutate()} disabled={!retryInstruction.trim()}>Retry</button><VariantList adventureId={adventureId} responseGroupId={turn.responseGroupId} selectedIds={includeVariantIds} onToggle={(id) => setIncludeVariantIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id])} /></div> : null}{showInspect ? <InspectPanel adventureId={adventureId} turnId={turn.id} /> : null}</article>;
}

/** List and select variants for a response group. */
function VariantList({ adventureId, responseGroupId, selectedIds, onToggle }: { adventureId: string; responseGroupId: string; selectedIds: string[]; onToggle: (id: string) => void }) {
  const queryClient = useQueryClient();
  const variants = useQuery({ queryKey: ["variants", adventureId, responseGroupId], queryFn: () => api.listVariants(adventureId, responseGroupId) });
  const select = useMutation({ mutationFn: (variant: GenerationVariant) => api.selectVariant(adventureId, variant.id), onSuccess: () => queryClient.invalidateQueries() });
  if (!variants.data || variants.data.total <= 1) return null;
  return <div className="variant-list">{variants.data.items.map((variant) => <div className="list-item" key={variant.id}><button className={variant.isActive ? "active" : "ghost"} onClick={() => select.mutate(variant)}>Use Variant {variant.createdAt.slice(11, 19)}</button><label className="checkbox"><input type="checkbox" checked={selectedIds.includes(variant.id)} onChange={() => onToggle(variant.id)} /> Include in retry</label><p>{variant.content.slice(0, 180)}</p></div>)}</div>;
}

/** Inspect prompt context for generated turns. */
function InspectPanel({ adventureId, turnId }: { adventureId: string; turnId: string }) {
  const report = useQuery<ContextReport>({ queryKey: ["contextReport", adventureId, turnId], queryFn: () => api.getContextReport(adventureId, turnId) });
  const snapshot = useQuery({ queryKey: ["promptSnapshot", adventureId, turnId], queryFn: () => api.getPromptSnapshot(adventureId, turnId), enabled: !!report.data });
  const usage = useQuery({ queryKey: ["tokenUsage", adventureId, turnId], queryFn: () => api.getTokenUsage(adventureId, turnId), enabled: !!report.data });
  if (report.isLoading) return <div className="subcard">Loading context report...</div>;
  if (!report.data) return <div className="subcard warning">No context report available for this turn.</div>;
  return <div className="subcard"><h3>Context Report</h3><p>Turns: {report.data.includedTurnRange.first ?? "none"} to {report.data.includedTurnRange.last ?? "none"}</p><p>Activated cards: {report.data.activatedCards.length}</p>{usage.data ? <p>{usage.data.totalTokens} tokens · {usage.data.provider}/{usage.data.modelId}</p> : null}<pre>{JSON.stringify(report.data.estimatedTokensByLayer, null, 2)}</pre>{snapshot.data ? <details><summary>Prompt Messages</summary><pre>{JSON.stringify(snapshot.data.messages, null, 2)}</pre></details> : null}</div>;
}

/** Model picker showing merged personal/global available model configs. */
function ModelPicker({ models, value, onChange }: { models: ModelConfig[]; value: string | null; onChange: (value: string | null) => void }) {
  return <select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}><option value="">Default model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.displayName} ({model.ownerType})</option>)}</select>;
}

/** Provider settings for user-owned provider connections and write-only API keys. */
function ProviderSettings() {
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => api.listProviders() });
  const create = useMutation({ mutationFn: (payload: Record<string, unknown>) => api.createProvider(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["providers"] }) });
  /** Create a provider connection from the settings form. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({ name: form.get("name"), providerType: form.get("providerType"), protocol: form.get("protocol"), baseUrl: form.get("baseUrl"), apiKey: form.get("apiKey") });
    event.currentTarget.reset();
  }
  return <section className="stack"><Panel title="Add Provider"><form className="stack" onSubmit={submit}><input name="name" placeholder="Display name" /><input name="providerType" placeholder="openrouter/openai/gemini/custom" /><input name="protocol" defaultValue="openai_chat_completions" /><input name="baseUrl" placeholder="Optional base URL" /><input name="apiKey" placeholder="Write-only API key" type="password" /><button>Add Provider</button></form></Panel><Panel title="Providers">{providers.data?.items.map((provider) => <ProviderRow key={provider.id} provider={provider} queryKey="providers" admin={false} />)}</Panel></section>;
}

/** Display safe provider metadata without raw credential material. */
function ProviderRow({ provider, queryKey, admin }: { provider: ProviderConnection; queryKey: string; admin: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ name: provider.name, protocol: provider.protocol, baseUrl: provider.baseUrl, apiKey: "" });
  const toggle = useMutation({ mutationFn: () => admin ? api.updateAdminProvider(provider.id, { isEnabled: !provider.isEnabled }) : api.updateProvider(provider.id, { isEnabled: !provider.isEnabled }), onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }) });
  const save = useMutation({ mutationFn: () => admin ? api.updateAdminProvider(provider.id, draft) : api.updateProvider(provider.id, draft), onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }) });
  const remove = useMutation({ mutationFn: () => admin ? api.deleteAdminProvider(provider.id) : api.deleteProvider(provider.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }) });
  const test = useMutation({ mutationFn: () => admin ? api.testAdminProvider(provider.id) : api.testProvider(provider.id) });
  const modelDiscovery = useMutation({ mutationFn: () => admin ? api.fetchAdminProviderModels(provider.id) : api.fetchProviderModels(provider.id) });
  return <div className="list-item"><strong>{provider.name}</strong><span>{provider.providerType} · {provider.hasCredential ? "credential configured" : "no credential"} · {provider.isEnabled ? "enabled" : "disabled"}</span><details><summary>Edit Provider</summary><div className="stack"><input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /><input value={draft.protocol} onChange={(event) => setDraft({ ...draft, protocol: event.target.value })} /><input value={draft.baseUrl} placeholder="Base URL" onChange={(event) => setDraft({ ...draft, baseUrl: event.target.value })} /><input value={draft.apiKey} placeholder="New write-only API key" type="password" onChange={(event) => setDraft({ ...draft, apiKey: event.target.value })} /><button onClick={() => save.mutate()}>Save Provider</button></div></details><div className="mode-row"><button className="ghost" onClick={() => toggle.mutate()}>{provider.isEnabled ? "Disable" : "Enable"}</button><button className="ghost" onClick={() => test.mutate()}>Test</button><button className="ghost" onClick={() => modelDiscovery.mutate()}>Fetch Models</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div>{test.data ? <span>{test.data.ok ? "Connection has credentials" : "No usable credential"}</span> : null}{modelDiscovery.data ? <pre>{JSON.stringify(modelDiscovery.data.models, null, 2)}</pre> : null}</div>;
}

/** Model settings for user-owned model configs. */
function ModelSettings() {
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ["providers"], queryFn: () => api.listProviders() });
  const models = useQuery({ queryKey: ["models"], queryFn: () => api.listModels() });
  const create = useMutation({ mutationFn: (payload: Record<string, unknown>) => api.createModel(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["models"] }) });
  /** Create a model config from the settings form. */
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    create.mutate({ providerConnectionId: form.get("providerConnectionId"), displayName: form.get("displayName"), modelId: form.get("modelId"), contextWindow: Number(form.get("contextWindow") || 32768), userContextLimitDefault: Number(form.get("userContextLimitDefault") || form.get("contextWindow") || 32768), visibleResponseTargetTokens: Number(form.get("visibleResponseTargetTokens") || 350), temperature: Number(form.get("temperature") || 0.8), topP: Number(form.get("topP") || 0.95), thinkingEnabled: form.get("thinkingEnabled") === "on", thinkingBudget: Number(form.get("thinkingBudget") || 0) || null, showThinkingDefault: form.get("showThinkingDefault") === "on", streamThinkingDefault: form.get("streamThinkingDefault") === "on", additionalSystemPrompt: form.get("additionalSystemPrompt"), extraParameters: parseJsonObject(String(form.get("extraParameters") || "{}")) });
  }
  return <section className="stack"><Panel title="Create Model"><ModelForm providers={providers.data?.items ?? []} onSubmit={submit} /></Panel><Panel title="Models">{models.data?.items.map((model, index) => <ModelRow key={model.id} model={model} models={models.data?.items ?? []} index={index} queryKey="models" admin={false} />)}</Panel></section>;
}

/** Parse extra model provider parameters without allowing non-object JSON values. */
function parseJsonObject(raw: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Shared advanced model creation form for user and admin scopes. */
function ModelForm({ providers, onSubmit }: { providers: ProviderConnection[]; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="stack" onSubmit={onSubmit}><select name="providerConnectionId">{providers.map((provider) => <option value={provider.id} key={provider.id}>{provider.name}</option>)}</select><input name="displayName" placeholder="Display name" /><input name="modelId" placeholder="upstream model id" /><input name="contextWindow" type="number" defaultValue={32768} /><input name="userContextLimitDefault" type="number" defaultValue={8192} /><input name="visibleResponseTargetTokens" type="number" defaultValue={350} /><input name="temperature" type="number" step="0.1" defaultValue={0.8} /><input name="topP" type="number" step="0.01" defaultValue={0.95} /><input name="thinkingBudget" type="number" placeholder="Thinking budget" /><label className="checkbox"><input name="thinkingEnabled" type="checkbox" /> Thinking enabled</label><label className="checkbox"><input name="showThinkingDefault" type="checkbox" /> Show thinking by default</label><label className="checkbox"><input name="streamThinkingDefault" type="checkbox" /> Stream thinking by default</label><textarea name="additionalSystemPrompt" placeholder="Optional additional system prompt" /><textarea name="extraParameters" defaultValue="{}" /><button>Create Model</button></form>;
}

/** Editable model row actions for default/toggle/delete settings. */
function ModelRow({ model, models, index, queryKey, admin }: { model: ModelConfig; models: ModelConfig[]; index: number; queryKey: string; admin: boolean }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({ displayName: model.displayName, modelId: model.modelId, contextWindow: model.contextWindow, userContextLimitDefault: model.userContextLimitDefault, visibleResponseTargetTokens: model.visibleResponseTargetTokens, temperature: model.temperature, topP: model.topP, thinkingEnabled: model.thinkingEnabled, thinkingBudget: model.thinkingBudget ?? "", showThinkingDefault: model.showThinkingDefault ?? false, streamThinkingDefault: model.streamThinkingDefault ?? false, additionalSystemPrompt: model.additionalSystemPrompt ?? "", extraParameters: JSON.stringify(model.extraParameters ?? {}, null, 2) });
  const save = useMutation({ mutationFn: () => admin ? api.updateAdminModel(model.id, { ...draft, extraParameters: parseJsonObject(draft.extraParameters) }) : api.updateModel(model.id, { ...draft, extraParameters: parseJsonObject(draft.extraParameters) }), onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }) });
  const toggle = useMutation({ mutationFn: () => admin ? api.updateAdminModel(model.id, { isEnabled: !model.isEnabled }) : api.updateModel(model.id, { isEnabled: !model.isEnabled }), onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }) });
  const setDefault = useMutation({ mutationFn: () => admin ? api.setDefaultAdminModel(model.id) : api.setDefaultModel(model.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }) });
  const remove = useMutation({ mutationFn: () => admin ? api.deleteAdminModel(model.id) : api.deleteModel(model.id), onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }) });
  const reorder = useMutation({ mutationFn: (direction: -1 | 1) => admin ? api.reorderAdminModels(moveId(models.map((item) => item.id), index, direction)) : api.reorderModels(moveId(models.map((item) => item.id), index, direction)), onSuccess: () => queryClient.invalidateQueries({ queryKey: [queryKey] }) });
  return <div className="list-item"><strong>{model.displayName}</strong><span>{model.providerName} · {model.modelId} · {model.ownerType} · {model.isDefault ? "default" : "not default"}</span><details><summary>Edit Model</summary><div className="stack"><input value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /><input value={draft.modelId} onChange={(event) => setDraft({ ...draft, modelId: event.target.value })} /><input type="number" value={draft.contextWindow} onChange={(event) => setDraft({ ...draft, contextWindow: Number(event.target.value) })} /><input type="number" value={draft.userContextLimitDefault} onChange={(event) => setDraft({ ...draft, userContextLimitDefault: Number(event.target.value) })} /><input type="number" value={draft.visibleResponseTargetTokens} onChange={(event) => setDraft({ ...draft, visibleResponseTargetTokens: Number(event.target.value) })} /><input type="number" step="0.1" value={draft.temperature} onChange={(event) => setDraft({ ...draft, temperature: Number(event.target.value) })} /><input type="number" step="0.01" value={draft.topP} onChange={(event) => setDraft({ ...draft, topP: Number(event.target.value) })} /><input type="number" value={draft.thinkingBudget} onChange={(event) => setDraft({ ...draft, thinkingBudget: event.target.value ? Number(event.target.value) : "" })} /><label className="checkbox"><input type="checkbox" checked={draft.thinkingEnabled} onChange={(event) => setDraft({ ...draft, thinkingEnabled: event.target.checked })} /> Thinking enabled</label><label className="checkbox"><input type="checkbox" checked={draft.showThinkingDefault} onChange={(event) => setDraft({ ...draft, showThinkingDefault: event.target.checked })} /> Show thinking</label><label className="checkbox"><input type="checkbox" checked={draft.streamThinkingDefault} onChange={(event) => setDraft({ ...draft, streamThinkingDefault: event.target.checked })} /> Stream thinking</label><textarea value={draft.additionalSystemPrompt} onChange={(event) => setDraft({ ...draft, additionalSystemPrompt: event.target.value })} /><label>Extra Parameters JSON<textarea className="json-input-sm" value={draft.extraParameters} onChange={(event) => setDraft({ ...draft, extraParameters: event.target.value })} /></label><button onClick={() => save.mutate()}>Save Model</button></div></details><div className="mode-row"><button className="ghost" onClick={() => toggle.mutate()}>{model.isEnabled ? "Disable" : "Enable"}</button>{admin ? null : <button className="ghost" onClick={() => setDefault.mutate()}>Set Default</button>}{admin ? <button className="ghost" onClick={() => setDefault.mutate()}>Set Default</button> : null}<button className="ghost" disabled={index === 0} onClick={() => reorder.mutate(-1)}>Up</button><button className="ghost" disabled={index === models.length - 1} onClick={() => reorder.mutate(1)}>Down</button><button className="ghost" onClick={() => remove.mutate()}>Delete</button></div></div>;
}

/** Admin/global provider and model settings for platform-backed models. */
function AdminSettings() {
  const queryClient = useQueryClient();
  const providers = useQuery({ queryKey: ["adminProviders"], queryFn: api.listAdminProviders });
  const models = useQuery({ queryKey: ["adminModels"], queryFn: api.listAdminModels });
  const diagnostics = useQuery({ queryKey: ["adminDiagnostics"], queryFn: api.adminDiagnostics });
  const usage = useQuery({ queryKey: ["adminUsage"], queryFn: api.adminUsage });
  const createProvider = useMutation({ mutationFn: (payload: Record<string, unknown>) => api.createAdminProvider(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminProviders"] }) });
  const createModel = useMutation({ mutationFn: (payload: Record<string, unknown>) => api.createAdminModel(payload), onSuccess: () => queryClient.invalidateQueries({ queryKey: ["adminModels"] }) });
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

/** Simple page metadata display with optional load-more control for paginated list results. */
function PageInfo({ total, shown, hasMore, onLoadMore }: { total: number; shown: number; hasMore?: boolean; onLoadMore?: () => void }) {
  if (total === 0) return null;
  return <div className="page-info"><span>Showing {shown} of {total}</span>{hasMore && onLoadMore ? <button className="ghost" onClick={onLoadMore}>Load more</button> : null}</div>;
}

/** AID import preview/confirm flow with warning display. */
function ImportFlow() {
  const [raw, setRaw] = useState("{}");
  const [kind, setKind] = useState<"aid" | "native">("aid");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const navigate = useNavigate();
  const previewMutation = useMutation({ mutationFn: () => kind === "aid" ? api.previewAid(JSON.parse(raw)) : api.previewNative(JSON.parse(raw)), onSuccess: setPreview });
  const confirm = useMutation({ mutationFn: () => kind === "aid" ? api.confirmAid(preview!) : api.confirmNative(preview!), onSuccess: (scenario) => navigate(`/scenarios/${scenario.id}`) });
  /** Load an uploaded JSON file into the preview textarea for AID/native import. */
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setRaw(await file.text());
  }
  return <section className="stack"><Panel title="Import Scenario"><div className="mode-row"><button className={kind === "aid" ? "active" : "ghost"} onClick={() => setKind("aid")}>AI Dungeon</button><button className={kind === "native" ? "active" : "ghost"} onClick={() => setKind("native")}>ImaginAI Native</button></div><input type="file" accept="application/json,.json" onChange={readFile} /><textarea className="json-input" value={raw} onChange={(event) => setRaw(event.target.value)} /><button onClick={() => previewMutation.mutate()}>Preview</button>{preview ? <div className="subcard stack"><h3>{preview.scenario.title}</h3>{preview.warnings.length > 0 ? <div><p className="eyebrow">Warnings</p>{preview.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}</div> : null}{preview.scenario.modules.length > 0 ? <div><p className="eyebrow">Modules ({preview.scenario.modules.length})</p><ul className="import-preview-list">{preview.scenario.modules.map((mod, i) => <li key={i}><strong>{mod.title || "Untitled Module"}</strong>{!mod.isEnabled ? <span className="tag warning">disabled</span> : null}</li>)}</ul></div> : null}{preview.scenario.cards.length > 0 ? <div><p className="eyebrow">Cards ({preview.scenario.cards.length})</p><ul className="import-preview-list">{preview.scenario.cards.map((card, i) => <li key={i}><strong>{card.title || "Untitled Card"}</strong> <span className="tag">{card.cardType}</span>{!card.isEnabled ? <span className="tag warning">disabled</span> : null}</li>)}</ul></div> : null}<details><summary>Mapped Preview</summary><pre>{JSON.stringify(preview.scenario, null, 2)}</pre></details><button onClick={() => confirm.mutate()}>Confirm Import</button></div> : null}</Panel></section>;
}
