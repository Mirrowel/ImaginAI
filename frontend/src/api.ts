import type { AdminDiagnostics, AdminUsageRow, Adventure, AdventureMemory, AdventureStateEvent, AdventureSummary, AdventureTurn, ContextReport, GenerationEvent, GenerationVariant, ImportPreview, ModelConfig, Page, PromptSnapshot, ProviderConnection, Scenario, ScenarioModule, ScenarioVersion, StoryCard, TokenUsage, User } from "./types";
import { parseSseFrames } from "./streaming";

const API_BASE = "/api";
let csrfReady: Promise<void> | null = null;

/** Read a cookie value for CSRF/session-compatible requests. */
function cookie(name: string): string {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : "";
}

/** Ensure the backend has set a CSRF cookie before unsafe browser requests. */
async function ensureCsrf(method?: string): Promise<void> {
  const unsafe = method && !["GET", "HEAD", "OPTIONS", "TRACE"].includes(method.toUpperCase());
  if (!unsafe || cookie("csrftoken")) return;
  csrfReady ??= fetch(`${API_BASE}/csrf`, { credentials: "include" }).then((response) => {
    if (!response.ok) throw new Error(`CSRF bootstrap failed: ${response.status}`);
    if (!cookie("csrftoken")) throw new Error("CSRF bootstrap did not set a csrftoken cookie");
  });
  await csrfReady;
}

/** Call the Django/Ninja API with JSON, credentials, and safe error handling. */
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  await ensureCsrf(options.method);
  const response = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": cookie("csrftoken"),
      ...(options.headers ?? {}),
    },
    ...options,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** POST to a streaming endpoint and parse newline-delimited SSE data events. */
export async function streamApi(path: string, payload: unknown, onEvent: (event: GenerationEvent) => void): Promise<void> {
  await ensureCsrf("POST");
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRFToken": cookie("csrftoken") },
    body: JSON.stringify(payload),
  });
  if (!response.ok || !response.body) {
    throw new Error(await response.text() || `Stream failed: ${response.status}`);
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const parsed = parseSseFrames(buffer, decoder.decode(value, { stream: true }));
    buffer = parsed.remainder;
    parsed.events.forEach(onEvent);
  }
}

/** Return the current session user if logged in. */
export function getMe(): Promise<{ user: User | null }> {
  return api("/auth/me");
}

/** Log in with alpha nickname/password credentials. */
export function login(nickname: string, password: string): Promise<{ user: User }> {
  return api("/auth/login", { method: "POST", body: JSON.stringify({ nickname, password }) });
}

/** Register with alpha nickname/password credentials. */
export function register(nickname: string, password: string): Promise<{ user: User }> {
  return api("/auth/register", { method: "POST", body: JSON.stringify({ nickname, password }) });
}

/** Log out the current browser session. */
export function logout(): Promise<{ ok: true }> {
  return api("/auth/logout", { method: "POST", body: JSON.stringify({}) });
}

/** List user-owned scenarios with optional pagination. */
export function listScenarios(page?: number, limit?: number): Promise<Page<Scenario>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return api(`/scenarios${qs ? `?${qs}` : ""}`);
}

/** Fetch a scenario with draft modules and cards. */
export function getScenario(id: string): Promise<Scenario> {
  return api(`/scenarios/${id}`);
}

/** Create a minimal scenario draft. */
export function createScenario(title: string): Promise<Scenario> {
  return api("/scenarios", { method: "POST", body: JSON.stringify({ title }) });
}

/** Patch scenario metadata. */
export function updateScenario(id: string, payload: Partial<Scenario>): Promise<Scenario> {
  return api(`/scenarios/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Delete a scenario draft and its rewrite-owned content. */
export function deleteScenario(id: string): Promise<{ ok: true }> {
  return api(`/scenarios/${id}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** Duplicate a scenario draft for experimentation. */
export function duplicateScenario(id: string, title?: string): Promise<Scenario> {
  return api(`/scenarios/${id}/duplicate`, { method: "POST", body: JSON.stringify({ title }) });
}

/** Freeze the current draft into an immutable version. */
export function freezeScenario(id: string, changeNote = "Manual freeze"): Promise<ScenarioVersion> {
  return api(`/scenarios/${id}/freeze-version`, { method: "POST", body: JSON.stringify({ changeNote }) });
}

/** List immutable scenario versions. */
export function listScenarioVersions(id: string): Promise<Page<ScenarioVersion>> {
  return api(`/scenarios/${id}/versions`);
}

/** Export a native ImaginAI scenario payload. */
export function exportScenario(id: string): Promise<unknown> {
  return api(`/scenarios/${id}/export`);
}

/** Create a scenario draft module. */
export function createScenarioModule(scenarioId: string, payload: Partial<ScenarioModule>): Promise<ScenarioModule> {
  return api(`/scenarios/${scenarioId}/draft/modules`, { method: "POST", body: JSON.stringify(payload) });
}

/** Persist scenario draft module order. */
export function reorderScenarioModules(scenarioId: string, moduleIds: string[]): Promise<{ ok: true; modules: ScenarioModule[] }> {
  return api(`/scenarios/${scenarioId}/draft/modules/reorder`, { method: "POST", body: JSON.stringify({ moduleIds }) });
}

/** Patch a scenario draft module. */
export function updateScenarioModule(moduleId: string, payload: Partial<ScenarioModule>): Promise<ScenarioModule> {
  return api(`/scenario-modules/${moduleId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Delete a scenario draft module. */
export function deleteScenarioModule(moduleId: string): Promise<{ ok: true }> {
  return api(`/scenario-modules/${moduleId}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** Create a scenario draft card. */
export function createScenarioCard(scenarioId: string, payload: Partial<StoryCard>): Promise<StoryCard> {
  return api(`/scenarios/${scenarioId}/draft/cards`, { method: "POST", body: JSON.stringify(payload) });
}

/** Persist scenario draft card order. */
export function reorderScenarioCards(scenarioId: string, cardIds: string[]): Promise<{ ok: true; cards: StoryCard[] }> {
  return api(`/scenarios/${scenarioId}/draft/cards/reorder`, { method: "POST", body: JSON.stringify({ cardIds }) });
}

/** Import draft story cards into a scenario. */
export function importScenarioCards(scenarioId: string, cards: Partial<StoryCard>[], replace = false): Promise<Page<StoryCard>> {
  return api(`/scenarios/${scenarioId}/draft/cards/import`, { method: "POST", body: JSON.stringify({ cards, replace }) });
}

/** Export draft story cards in AID-compatible format. */
export function exportScenarioCards(scenarioId: string): Promise<{ cards: unknown[] }> {
  return api(`/scenarios/${scenarioId}/draft/cards/export`);
}

/** Patch a scenario draft card. */
export function updateScenarioCard(cardId: string, payload: Partial<StoryCard>): Promise<StoryCard> {
  return api(`/story-cards/${cardId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Delete a scenario draft card. */
export function deleteScenarioCard(cardId: string): Promise<{ ok: true }> {
  return api(`/story-cards/${cardId}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** Start an adventure from a scenario. */
export function startAdventure(scenarioId: string, title?: string): Promise<Adventure> {
  return api("/adventures/start", { method: "POST", body: JSON.stringify({ scenarioId, title }) });
}

/** List all adventures for a scenario with optional pagination. */
export function listScenarioAdventures(scenarioId: string, page?: number, limit?: number): Promise<Page<Adventure>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return api(`/scenarios/${scenarioId}/adventures${qs ? `?${qs}` : ""}`);
}

/** List recent adventures owned by the current user with optional pagination. */
export function listAdventures(page?: number, limit?: number): Promise<Page<Adventure>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return api(`/adventures${qs ? `?${qs}` : ""}`);
}

/** Fetch adventure state and turns. */
export function getAdventure(id: string): Promise<Adventure> {
  return api(`/adventures/${id}`);
}

/** Submit a Do/Say/Story action using the non-streaming fallback endpoint. */
export function generateTurn(adventureId: string, actionType: string, content: string, modelConfigId?: string | null, generationSettings?: Record<string, unknown>): Promise<unknown> {
  return api(`/adventures/${adventureId}/generate`, { method: "POST", body: JSON.stringify({ actionType, content, modelConfigId, generationSettings }) });
}

/** Submit a Do/Say/Story action through the streaming endpoint. */
export function streamGenerateTurn(adventureId: string, actionType: string, content: string, modelConfigId: string | null, onEvent: (event: GenerationEvent) => void, generationSettings?: Record<string, unknown>): Promise<void> {
  return streamApi(`/adventures/${adventureId}/generate-stream`, { actionType, content, modelConfigId, generationSettings }, onEvent);
}

/** Continue the current adventure using the non-streaming fallback endpoint. */
export function continueTurn(adventureId: string, modelConfigId?: string | null, generationSettings?: Record<string, unknown>): Promise<unknown> {
  return api(`/adventures/${adventureId}/continue`, { method: "POST", body: JSON.stringify({ modelConfigId, generationSettings }) });
}

/** Continue the current adventure through the streaming endpoint. */
export function streamContinueTurn(adventureId: string, modelConfigId: string | null, onEvent: (event: GenerationEvent) => void, generationSettings?: Record<string, unknown>): Promise<void> {
  return streamApi(`/adventures/${adventureId}/continue-stream`, { modelConfigId, generationSettings }, onEvent);
}

/** Retry one assistant response group with guidance. */
export function retryTurn(adventureId: string, responseGroupId: string, retryInstruction: string, modelConfigId?: string | null, generationSettings?: Record<string, unknown>): Promise<{ variant: GenerationVariant }> {
  return api(`/adventures/${adventureId}/retry`, { method: "POST", body: JSON.stringify({ responseGroupId, retryInstruction, modelConfigId, generationSettings }) });
}

/** Retry one assistant response group through the streaming endpoint. */
export function streamRetryTurn(adventureId: string, responseGroupId: string, retryInstruction: string, modelConfigId: string | null, includeVariantIds: string[], onEvent: (event: GenerationEvent) => void, generationSettings?: Record<string, unknown>): Promise<void> {
  return streamApi(`/adventures/${adventureId}/retry-stream`, { responseGroupId, retryInstruction, modelConfigId, includeVariantIds, generationSettings }, onEvent);
}

/** List variants for an adventure or response group. */
export function listVariants(adventureId: string, responseGroupId?: string | null): Promise<Page<GenerationVariant>> {
  return api(`/adventures/${adventureId}/variants${responseGroupId ? `?responseGroupId=${responseGroupId}` : ""}`);
}

/** Select an archived/active variant as the canonical assistant response. */
export function selectVariant(adventureId: string, variantId: string): Promise<{ variant: GenerationVariant; turn?: AdventureTurn | null }> {
  return api(`/adventures/${adventureId}/variants/${variantId}/select`, { method: "POST", body: JSON.stringify({}) });
}

/** Fetch the context report for generated turn inspection. */
export function getContextReport(adventureId: string, turnId: string): Promise<ContextReport> {
  return api(`/adventures/${adventureId}/turns/${turnId}/context-report`);
}

/** Fetch full prompt snapshot details for generated turn debugging. */
export function getPromptSnapshot(adventureId: string, turnId: string): Promise<PromptSnapshot> {
  return api(`/adventures/${adventureId}/turns/${turnId}/prompt-snapshot`);
}

/** Fetch token usage details for generated turn debugging. */
export function getTokenUsage(adventureId: string, turnId: string): Promise<TokenUsage> {
  return api(`/adventures/${adventureId}/turns/${turnId}/token-usage`);
}

/** Fetch the rough adventure summary used as long-term context. */
export function getSummary(adventureId: string): Promise<AdventureSummary> {
  return api(`/adventures/${adventureId}/summary`);
}

/** Update the rough adventure summary manually. */
export function updateSummary(adventureId: string, content: string): Promise<AdventureSummary> {
  return api(`/adventures/${adventureId}/summary`, { method: "PATCH", body: JSON.stringify({ content }) });
}

/** List precise adventure memories. */
export function listMemories(adventureId: string): Promise<Page<AdventureMemory>> {
  return api(`/adventures/${adventureId}/memories`);
}

/** Create a pinned adventure memory. */
export function createMemory(adventureId: string, payload: Partial<AdventureMemory>): Promise<AdventureMemory> {
  return api(`/adventures/${adventureId}/memories`, { method: "POST", body: JSON.stringify(payload) });
}

/** Fork an adventure from the selected turn. */
export function forkAdventure(adventureId: string, fromTurnId: string, title: string, note = "", switchToFork = false): Promise<Adventure & { switchToFork?: boolean }> {
  return api(`/adventures/${adventureId}/fork`, { method: "POST", body: JSON.stringify({ fromTurnId, title, note, switchToFork }) });
}

/** Patch an adventure-local module through append-only state events. */
export function updateAdventureModule(adventureId: string, moduleId: string, payload: Partial<ScenarioModule>): Promise<unknown> {
  return api(`/adventures/${adventureId}/state/modules/${moduleId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Create an adventure-local story card through state events. */
export function createAdventureCard(adventureId: string, payload: Partial<StoryCard>): Promise<unknown> {
  return api(`/adventures/${adventureId}/state/cards`, { method: "POST", body: JSON.stringify(payload) });
}

/** Patch an adventure-local story card through state events. */
export function updateAdventureCard(adventureId: string, cardId: string, payload: Partial<StoryCard>): Promise<unknown> {
  return api(`/adventures/${adventureId}/state/cards/${cardId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Delete an adventure-local story card through state events. */
export function deleteAdventureCard(adventureId: string, cardId: string): Promise<unknown> {
  return api(`/adventures/${adventureId}/state/cards/${cardId}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** Persist adventure-local card ordering through state events. */
export function reorderAdventureCards(adventureId: string, cardIds: string[]): Promise<{ ok: true }> {
  return api(`/adventures/${adventureId}/state/cards/reorder`, { method: "POST", body: JSON.stringify({ cardIds }) });
}

/** Archive an adventure while preserving it for future restore/export. */
export function archiveAdventure(adventureId: string): Promise<{ ok: true }> {
  return api(`/adventures/${adventureId}/archive`, { method: "POST", body: JSON.stringify({}) });
}

/** Soft-delete an adventure from normal lists. */
export function deleteAdventure(adventureId: string): Promise<{ ok: true }> {
  return api(`/adventures/${adventureId}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** List adventure state events for audit and debug inspection. */
export function listStateEvents(adventureId: string, page?: number, limit?: number): Promise<Page<AdventureStateEvent>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return api(`/adventures/${adventureId}/state-events${qs ? `?${qs}` : ""}`);
}

/** Patch the adventure-local model config override. */
export function updateAdventureModel(adventureId: string, modelConfigId: string | null): Promise<unknown> {
  return api(`/adventures/${adventureId}/state/model-settings`, { method: "PATCH", body: JSON.stringify({ modelConfigId }) });
}

/** Patch adventure-local generation setting overrides. */
export function updateAdventureGenerationSettings(adventureId: string, generationSettings: Record<string, unknown>): Promise<unknown> {
  return api(`/adventures/${adventureId}/state/model-settings`, { method: "PATCH", body: JSON.stringify({ generationSettings }) });
}

/** List user/provider model picker entries with optional pagination. */
export function availableModels(page?: number, limit?: number): Promise<Page<ModelConfig>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return api(`/available-model-configs${qs ? `?${qs}` : ""}`);
}

/** List user provider connections with optional pagination. */
export function listProviders(page?: number, limit?: number): Promise<Page<ProviderConnection>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return api(`/provider-connections${qs ? `?${qs}` : ""}`);
}

/** Create a user provider connection and optional primary API key. */
export function createProvider(payload: Record<string, unknown>): Promise<ProviderConnection> {
  return api("/provider-connections", { method: "POST", body: JSON.stringify(payload) });
}

/** Patch a user provider connection. */
export function updateProvider(id: string, payload: Record<string, unknown>): Promise<ProviderConnection> {
  return api(`/provider-connections/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Delete a user provider connection. */
export function deleteProvider(id: string): Promise<{ ok: true }> {
  return api(`/provider-connections/${id}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** Test that a provider has usable credentials. */
export function testProvider(id: string): Promise<{ ok: boolean }> {
  return api(`/provider-connections/${id}/test`, { method: "POST", body: JSON.stringify({}) });
}

/** Fetch provider-advertised upstream models. */
export function fetchProviderModels(id: string): Promise<{ models: string[] }> {
  return api(`/provider-connections/${id}/models`);
}

/** List user model configs with optional pagination. */
export function listModels(page?: number, limit?: number): Promise<Page<ModelConfig>> {
  const params = new URLSearchParams();
  if (page) params.set("page", String(page));
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  return api(`/model-configs${qs ? `?${qs}` : ""}`);
}

/** Create a user model config. */
export function createModel(payload: Record<string, unknown>): Promise<ModelConfig> {
  return api("/model-configs", { method: "POST", body: JSON.stringify(payload) });
}

/** Patch a user model config. */
export function updateModel(id: string, payload: Record<string, unknown>): Promise<ModelConfig> {
  return api(`/model-configs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Delete a user model config. */
export function deleteModel(id: string): Promise<{ ok: true }> {
  return api(`/model-configs/${id}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** Mark a user model config as default. */
export function setDefaultModel(id: string): Promise<ModelConfig> {
  return api(`/model-configs/${id}/set-default`, { method: "POST", body: JSON.stringify({}) });
}

/** Mark an admin model config as global default. */
export function setDefaultAdminModel(id: string): Promise<ModelConfig> {
  return api(`/admin/model-configs/${id}/set-default`, { method: "POST", body: JSON.stringify({}) });
}

/** Persist user model picker ordering. */
export function reorderModels(modelConfigIds: string[]): Promise<Page<ModelConfig>> {
  return api("/model-configs/reorder", { method: "POST", body: JSON.stringify({ modelConfigIds }) });
}

/** List admin-managed platform provider connections. */
export function listAdminProviders(): Promise<Page<ProviderConnection>> {
  return api("/admin/provider-connections");
}

/** Create an admin-managed platform provider connection. */
export function createAdminProvider(payload: Record<string, unknown>): Promise<ProviderConnection> {
  return api("/admin/provider-connections", { method: "POST", body: JSON.stringify(payload) });
}

/** Patch an admin-managed platform provider connection. */
export function updateAdminProvider(id: string, payload: Record<string, unknown>): Promise<ProviderConnection> {
  return api(`/admin/provider-connections/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Delete an admin-managed platform provider connection. */
export function deleteAdminProvider(id: string): Promise<{ ok: true }> {
  return api(`/admin/provider-connections/${id}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** Test an admin-managed platform provider connection. */
export function testAdminProvider(id: string): Promise<{ ok: boolean }> {
  return api(`/admin/provider-connections/${id}/test`, { method: "POST", body: JSON.stringify({}) });
}

/** Fetch provider-advertised upstream models for an admin provider. */
export function fetchAdminProviderModels(id: string): Promise<{ models: string[] }> {
  return api(`/admin/provider-connections/${id}/models`);
}

/** List admin-managed platform model configs. */
export function listAdminModels(): Promise<Page<ModelConfig>> {
  return api("/admin/model-configs");
}

/** Create an admin-managed platform model config. */
export function createAdminModel(payload: Record<string, unknown>): Promise<ModelConfig> {
  return api("/admin/model-configs", { method: "POST", body: JSON.stringify(payload) });
}

/** Patch an admin-managed platform model config. */
export function updateAdminModel(id: string, payload: Record<string, unknown>): Promise<ModelConfig> {
  return api(`/admin/model-configs/${id}`, { method: "PATCH", body: JSON.stringify(payload) });
}

/** Delete an admin-managed platform model config. */
export function deleteAdminModel(id: string): Promise<{ ok: true }> {
  return api(`/admin/model-configs/${id}`, { method: "DELETE", body: JSON.stringify({}) });
}

/** Persist platform/global model picker ordering. */
export function reorderAdminModels(modelConfigIds: string[]): Promise<Page<ModelConfig>> {
  return api("/admin/model-configs/reorder", { method: "POST", body: JSON.stringify({ modelConfigIds }) });
}

/** Fetch admin-only domain diagnostics. */
export function adminDiagnostics(): Promise<AdminDiagnostics> {
  return api("/admin/diagnostics");
}

/** Fetch admin-only app-level usage rows. */
export function adminUsage(): Promise<Page<AdminUsageRow>> {
  return api("/admin/usage");
}

/** Preview an AI Dungeon import payload. */
export function previewAid(data: unknown): Promise<ImportPreview> {
  return api("/imports/aid/preview", { method: "POST", body: JSON.stringify({ data }) });
}

/** Confirm an import preview and create a scenario. */
export function confirmAid(preview: ImportPreview): Promise<Scenario> {
  return api("/imports/aid/confirm", { method: "POST", body: JSON.stringify(preview) });
}

/** Preview a native ImaginAI import payload. */
export function previewNative(data: unknown): Promise<ImportPreview> {
  return api("/imports/imaginai/preview", { method: "POST", body: JSON.stringify({ data }) });
}

/** Confirm a native ImaginAI import preview. */
export function confirmNative(preview: ImportPreview): Promise<Scenario> {
  return api("/imports/imaginai/confirm", { method: "POST", body: JSON.stringify(preview) });
}
