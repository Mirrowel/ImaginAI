import type { Adventure, ImportPreview, ModelConfig, Page, ProviderConnection, Scenario, User } from "./types";

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
  csrfReady ??= fetch(`${API_BASE}/csrf`, { credentials: "include" }).then(() => undefined);
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

/** List user-owned scenarios. */
export function listScenarios(): Promise<Page<Scenario>> {
  return api("/scenarios");
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

/** Start an adventure from a scenario. */
export function startAdventure(scenarioId: string, title?: string): Promise<Adventure> {
  return api("/adventures/start", { method: "POST", body: JSON.stringify({ scenarioId, title }) });
}

/** List all adventures for a scenario. */
export function listScenarioAdventures(scenarioId: string): Promise<Page<Adventure>> {
  return api(`/scenarios/${scenarioId}/adventures`);
}

/** Fetch adventure state and turns. */
export function getAdventure(id: string): Promise<Adventure> {
  return api(`/adventures/${id}`);
}

/** Submit a Do/Say/Story action using the non-streaming fallback endpoint. */
export function generateTurn(adventureId: string, actionType: string, content: string, modelConfigId?: string | null): Promise<unknown> {
  return api(`/adventures/${adventureId}/generate`, { method: "POST", body: JSON.stringify({ actionType, content, modelConfigId }) });
}

/** Continue the current adventure using the non-streaming fallback endpoint. */
export function continueTurn(adventureId: string, modelConfigId?: string | null): Promise<unknown> {
  return api(`/adventures/${adventureId}/continue`, { method: "POST", body: JSON.stringify({ modelConfigId }) });
}

/** Fork an adventure from the selected turn. */
export function forkAdventure(adventureId: string, fromTurnId: string, title: string): Promise<Adventure> {
  return api(`/adventures/${adventureId}/fork`, { method: "POST", body: JSON.stringify({ fromTurnId, title }) });
}

/** List user/provider model picker entries. */
export function availableModels(): Promise<Page<ModelConfig>> {
  return api("/available-model-configs");
}

/** List user provider connections. */
export function listProviders(): Promise<Page<ProviderConnection>> {
  return api("/provider-connections");
}

/** Create a user provider connection and optional primary API key. */
export function createProvider(payload: Record<string, unknown>): Promise<ProviderConnection> {
  return api("/provider-connections", { method: "POST", body: JSON.stringify(payload) });
}

/** List user model configs. */
export function listModels(): Promise<Page<ModelConfig>> {
  return api("/model-configs");
}

/** Create a user model config. */
export function createModel(payload: Record<string, unknown>): Promise<ModelConfig> {
  return api("/model-configs", { method: "POST", body: JSON.stringify(payload) });
}

/** Preview an AI Dungeon import payload. */
export function previewAid(data: unknown): Promise<ImportPreview> {
  return api("/imports/aid/preview", { method: "POST", body: JSON.stringify({ data }) });
}

/** Confirm an import preview and create a scenario. */
export function confirmAid(preview: ImportPreview): Promise<Scenario> {
  return api("/imports/aid/confirm", { method: "POST", body: JSON.stringify(preview) });
}
