import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import * as api from "./api";
import { useUiStore } from "./uiStore";

vi.mock("./api", () => ({
  getMe: vi.fn(),
  logout: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  listScenarios: vi.fn(),
  availableModels: vi.fn(),
  listProviders: vi.fn(),
  createProvider: vi.fn(),
  updateProvider: vi.fn(),
  deleteProvider: vi.fn(),
  testProvider: vi.fn(),
  previewAid: vi.fn(),
  previewNative: vi.fn(),
  confirmAid: vi.fn(),
  confirmNative: vi.fn(),
  listAdventures: vi.fn(),
  getAdventure: vi.fn(),
  getScenario: vi.fn(),
  listScenarioVersions: vi.fn(),
  listScenarioAdventures: vi.fn(),
  startAdventure: vi.fn(),
  archiveAdventure: vi.fn(),
  deleteAdventure: vi.fn(),
  listStateEvents: vi.fn(),
  updateScenarioCard: vi.fn(),
  deleteScenarioCard: vi.fn(),
  generateTurn: vi.fn(),
  streamGenerateTurn: vi.fn(),
  continueTurn: vi.fn(),
  streamContinueTurn: vi.fn(),
  streamRetryTurn: vi.fn(),
  setDefaultModel: vi.fn(),
  setDefaultAdminModel: vi.fn(),
  listAdminModels: vi.fn(),
  listAdminProviders: vi.fn(),
  adminDiagnostics: vi.fn(),
  adminUsage: vi.fn(),
  listModels: vi.fn(),
  updateModel: vi.fn(),
  updateAdventureCard: vi.fn(),
}));

/** Render the authenticated app at a specific route with isolated query state. */
function renderRoute(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><App /></MemoryRouter></QueryClientProvider>);
}

describe("App routes", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listScenarios).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listProviders).mockResolvedValue({ items: [{ id: "p1", ownerType: "user", name: "OpenRouter", providerType: "openrouter", protocol: "openai_chat_completions", baseUrl: "", isEnabled: true, hasCredential: true }], total: 1 });
    vi.mocked(api.listAdventures).mockResolvedValue({ items: [], total: 0 });
  });

  it("renders provider settings without exposing raw secret material", async () => {
    renderRoute("/providers");

    expect(await screen.findByText("OpenRouter")).toBeInTheDocument();
    expect(screen.getByText(/credential configured/i)).toBeInTheDocument();
    expect(screen.queryByText(/sk-/i)).not.toBeInTheDocument();
  });

  it("previews native ImaginAI imports from pasted JSON", async () => {
    vi.mocked(api.previewNative).mockResolvedValue({ scenario: { title: "Native World", modules: [], cards: [] }, warnings: [], metadata: {} });
    renderRoute("/import");

    await screen.findByText("Import Scenario");
    await userEvent.click(screen.getByRole("button", { name: "ImaginAI Native" }));
    const jsonBox = screen.getByDisplayValue("{}");
    await userEvent.clear(jsonBox);
    await userEvent.click(jsonBox);
    await userEvent.paste('{"schemaVersion":1,"scenario":{"title":"Native World"}}');
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => expect(api.previewNative).toHaveBeenCalled());
    expect(await screen.findByText("Native World")).toBeInTheDocument();
  });

  it("shows module and card titles in import preview", async () => {
    vi.mocked(api.previewAid).mockResolvedValue({
      scenario: {
        title: "AID World",
        modules: [{ id: "m1", moduleType: "custom", title: "Lore", content: "stuff", settings: {}, sortOrder: 0, isEnabled: true }],
        cards: [{ id: "c1", title: "Dragon", cardType: "concept", summary: "", content: "fire", triggerWords: ["dragon"], activationMode: "triggered" as const, priority: 0, sortOrder: 0, isEnabled: true, useForCharacterCreation: false, tokenBudget: null, metadata: {} }],
      },
      warnings: ["Empty content in card"],
      metadata: {},
    });
    renderRoute("/import");

    await screen.findByText("Import Scenario");
    await userEvent.click(screen.getByRole("button", { name: "Preview" }));

    await waitFor(() => expect(api.previewAid).toHaveBeenCalled());
    expect(await screen.findByText("AID World")).toBeInTheDocument();
    expect(screen.getByText("Lore")).toBeInTheDocument();
    expect(screen.getByText("Dragon")).toBeInTheDocument();
    expect(screen.getByText("Empty content in card")).toBeInTheDocument();
  });
});

describe("ScenarioLibrary search filter", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listScenarios).mockResolvedValue({
      items: [
        { id: "s1", title: "Dragon Quest", description: "A dragon adventure", visibility: "private" as const, tags: ["fantasy"], defaultModelConfigId: null },
        { id: "s2", title: "Space Odyssey", description: "Explore the stars", visibility: "private" as const, tags: ["scifi"], defaultModelConfigId: null },
      ],
      total: 2,
    });
  });

  it("filters scenarios by title when search input is typed", async () => {
    renderRoute("/scenarios");

    expect(await screen.findByText("Dragon Quest")).toBeInTheDocument();
    expect(screen.getByText("Space Odyssey")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search scenarios/i);
    await userEvent.type(searchInput, "dragon");

    expect(screen.getByText("Dragon Quest")).toBeInTheDocument();
    expect(screen.queryByText("Space Odyssey")).not.toBeInTheDocument();
  });
});

describe("Local preferences", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listScenarios).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listAdventures).mockResolvedValue({ items: [], total: 0 });
  });

  it("applies sidebar-compact class when sidebarSize preference is compact", async () => {
    useUiStore.getState().setSidebarSize("compact");
    renderRoute("/");

    await screen.findByText("Story sandbox");
    const shell = document.querySelector(".app-shell");
    expect(shell?.classList.contains("sidebar-compact")).toBe(true);

    useUiStore.getState().setSidebarSize("comfortable");
  });
});

describe("Gameplay thinking delta and generation settings", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listScenarios).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listAdventures).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.getAdventure).mockResolvedValue({
      id: "adv1", scenarioId: "s1", scenarioVersionId: "sv1", title: "Test Adventure", status: "active" as const,
      turns: [
        { id: "t1", sequence: 1, timelineSequence: 1, role: "user" as const, content: "Hello", isDeleted: false },
        { id: "t2", sequence: 2, timelineSequence: 2, role: "assistant" as const, content: "Hi there", responseGroupId: "rg1", isDeleted: false },
      ],
    });
  });

  it("renders gameplay with quick settings toggle", async () => {
    renderRoute("/adventures/adv1");

    expect(await screen.findByText("Test Adventure")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Settings" })).toBeInTheDocument();
  });

  it("shows quick settings panel when Settings is clicked", async () => {
    renderRoute("/adventures/adv1");

    await screen.findByText("Test Adventure");
    await userEvent.click(screen.getByRole("button", { name: "Settings" }));

    expect(screen.getByText("Context limit")).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText("default").length).toBe(4);
    expect(screen.getByText("Thinking")).toBeInTheDocument();
    expect(screen.getByText("Show thinking")).toBeInTheDocument();
  });

  it("passes generation settings to non-streaming generate API", async () => {
    useUiStore.getState().setTextStreamingEnabled(false);
    vi.mocked(api.generateTurn).mockResolvedValue({});

    renderRoute("/adventures/adv1");
    await screen.findByText("Test Adventure");

    await userEvent.click(screen.getByRole("button", { name: "Settings" }));

    const tempInputs = screen.getAllByPlaceholderText("default");
    await userEvent.type(tempInputs[2], "0.5");

    const textarea = screen.getByPlaceholderText(/what do you/i);
    await userEvent.type(textarea, "Test action");

    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(api.generateTurn).toHaveBeenCalled());
    const callArgs = vi.mocked(api.generateTurn).mock.calls[0];
    expect(callArgs[0]).toBe("adv1");
    expect(callArgs[1]).toBe("do");
    expect(callArgs[2]).toBe("Test action");
    expect(callArgs[4]).toEqual({ temperature: 0.5 });

    useUiStore.getState().setTextStreamingEnabled(true);
  });

  it("auto-shows thinking panel when showThinkingDefault is on and thinking_delta arrives", async () => {
    useUiStore.getState().setStreamThinking(true);
    useUiStore.getState().setShowThinkingDefault(true);

    let capturedOnEvent: (event: import("./types").GenerationEvent) => void = () => {};
    vi.mocked(api.streamGenerateTurn).mockImplementation(async (_id, _action, _content, _modelId, onEvent) => {
      capturedOnEvent = onEvent;
    });

    renderRoute("/adventures/adv1");
    await screen.findByText("Test Adventure");

    const textarea = screen.getByPlaceholderText(/what do you/i);
    await userEvent.type(textarea, "Think");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(api.streamGenerateTurn).toHaveBeenCalled());

    capturedOnEvent({ type: "generation.thinking_delta", text: "Let me think..." });
    capturedOnEvent({ type: "generation.content_delta", text: "Hello!" });

    await waitFor(() => {
      const thinkingPanel = document.querySelector(".thinking-panel");
      expect(thinkingPanel).toBeInTheDocument();
      expect(thinkingPanel?.textContent).toContain("Let me think...");
    });

    useUiStore.getState().setStreamThinking(false);
    useUiStore.getState().setShowThinkingDefault(false);
  });

  it("retains thinking text after generation.final and clears on next action", async () => {
    useUiStore.getState().setStreamThinking(true);
    useUiStore.getState().setShowThinkingDefault(true);

    let capturedOnEvent: (event: import("./types").GenerationEvent) => void = () => {};
    vi.mocked(api.streamGenerateTurn).mockImplementation(async (_id, _action, _content, _modelId, onEvent) => {
      capturedOnEvent = onEvent;
    });
    vi.mocked(api.streamContinueTurn).mockImplementation(async () => {});

    renderRoute("/adventures/adv1");
    await screen.findByText("Test Adventure");

    const textarea = screen.getByPlaceholderText(/what do you/i);
    await userEvent.type(textarea, "Think");
    await userEvent.click(screen.getByRole("button", { name: "Submit" }));

    await waitFor(() => expect(api.streamGenerateTurn).toHaveBeenCalled());

    capturedOnEvent({ type: "generation.thinking_delta", text: "Reasoning step one..." });
    capturedOnEvent({ type: "generation.final", content: "The story continues." });

    await waitFor(() => {
      const thinkingPanel = document.querySelector(".thinking-panel");
      expect(thinkingPanel).toBeInTheDocument();
      expect(thinkingPanel?.textContent).toContain("Reasoning step one...");
    });

    await userEvent.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      const thinkingPanel = document.querySelector(".thinking-panel");
      expect(thinkingPanel).not.toBeInTheDocument();
    });

    useUiStore.getState().setStreamThinking(false);
    useUiStore.getState().setShowThinkingDefault(false);
  });
});

describe("Admin model default endpoint routing", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listScenarios).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listProviders).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listAdventures).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listAdminModels).mockResolvedValue({
      items: [{ id: "am1", ownerType: "platform", providerConnectionId: "p1", providerName: "Test", providerType: "openai", displayName: "Admin Model", modelId: "gpt-4", contextWindow: 128000, userContextLimitDefault: 32000, visibleResponseTargetTokens: 350, temperature: 0.8, topP: 0.95, thinkingEnabled: false, isDefault: false, isEnabled: true }],
      total: 1,
    });
    vi.mocked(api.listAdminProviders).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.adminDiagnostics).mockResolvedValue({});
    vi.mocked(api.adminUsage).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.setDefaultAdminModel).mockResolvedValue({} as never);
    vi.mocked(api.listModels).mockResolvedValue({ items: [], total: 0 });
  });

  it("renders admin model row and calls setDefaultAdminModel for admin rows", async () => {
    renderRoute("/admin");

    expect(await screen.findByText("Admin Model")).toBeInTheDocument();

    const setDefaultBtn = screen.getByRole("button", { name: "Set Default" });
    await userEvent.click(setDefaultBtn);

    await waitFor(() => expect(api.setDefaultAdminModel).toHaveBeenCalledWith("am1"));
    expect(api.setDefaultModel).not.toHaveBeenCalled();
  });
});

describe("Scenario editor card fields", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listScenarioVersions).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.updateScenarioCard).mockResolvedValue({} as never);
    vi.mocked(api.getScenario).mockResolvedValue({
      id: "s1",
      title: "Test Scenario",
      description: "",
      visibility: "private",
      tags: [],
      defaultModelConfigId: null,
      modules: [],
      cards: [
        {
          id: "c1",
          title: "Dragon",
          cardType: "character",
          summary: "A fire-breathing dragon",
          content: "Scaled wings",
          triggerWords: ["dragon"],
          activationMode: "triggered",
          priority: 100,
          sortOrder: 0,
          isEnabled: true,
          useForCharacterCreation: true,
          tokenBudget: 500,
          metadata: { source: "aid" },
        },
      ],
    });
  });

  it("renders all card editor fields including summary, activation mode, priority, token budget, metadata", async () => {
    renderRoute("/scenarios/s1");

    // Navigate to the Cards tab (Radix Tabs)
    const cardsTab = await screen.findByRole("tab", { name: /Cards/ });
    await userEvent.click(cardsTab);

    expect(await screen.findByDisplayValue("Dragon")).toBeInTheDocument();
    expect(screen.getByText("Activation Mode")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Token Budget")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Metadata JSON")).toBeInTheDocument();
    expect(screen.getByText("Character creation")).toBeInTheDocument();
  });

  it("saves card with updated fields through the API", async () => {
    renderRoute("/scenarios/s1");

    // Navigate to the Cards tab (Radix Tabs)
    const cardsTab = await screen.findByRole("tab", { name: /Cards/ });
    await userEvent.click(cardsTab);

    await screen.findByDisplayValue("Dragon");

    const saveBtn = screen.getByRole("button", { name: "Save Card" });
    await userEvent.click(saveBtn);

    await waitFor(() => expect(api.updateScenarioCard).toHaveBeenCalled());
    const callArgs = vi.mocked(api.updateScenarioCard).mock.calls[0];
    expect(callArgs[0]).toBe("c1");
    expect(callArgs[1]).toHaveProperty("summary", "A fire-breathing dragon");
    expect(callArgs[1]).toHaveProperty("activationMode", "triggered");
    expect(callArgs[1]).toHaveProperty("priority", 100);
    expect(callArgs[1]).toHaveProperty("tokenBudget", 500);
    expect(callArgs[1]).toHaveProperty("useForCharacterCreation", true);
    expect(callArgs[1]).toHaveProperty("metadata", { source: "aid" });
  });
});

describe("ScenarioAdventureList actions", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.getScenario).mockResolvedValue({ id: "s1", title: "Quest", description: "", visibility: "private", tags: [], defaultModelConfigId: null });
    vi.mocked(api.listScenarioAdventures).mockResolvedValue({
      items: [
        { id: "a1", scenarioId: "s1", scenarioVersionId: "sv1", title: "Active Adventure", status: "active" as const, parentAdventureId: null },
        { id: "a2", scenarioId: "s1", scenarioVersionId: "sv1", title: "Forked Adventure", status: "active" as const, parentAdventureId: "a1" },
      ],
      total: 2,
    });
    vi.mocked(api.archiveAdventure).mockResolvedValue({ ok: true });
    vi.mocked(api.deleteAdventure).mockResolvedValue({ ok: true });
    vi.mocked(api.startAdventure).mockResolvedValue({ id: "a3", scenarioId: "s1", scenarioVersionId: "sv1", title: "New", status: "active" } as never);
  });

  it("shows Start New Adventure button and adventure status tags", async () => {
    renderRoute("/scenarios/s1/adventures");

    expect(await screen.findByText("Start New Adventure")).toBeInTheDocument();
    expect(await screen.findByText("Active Adventure")).toBeInTheDocument();
    expect(screen.getByText("Forked Adventure")).toBeInTheDocument();
    expect(screen.getAllByText("active").length).toBeGreaterThanOrEqual(2);
  });

  it("shows fork ancestry for forked adventures", async () => {
    renderRoute("/scenarios/s1/adventures");

    await screen.findByText("Forked Adventure");
    expect(screen.getAllByText(/Fork/).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Root adventure/)).toBeInTheDocument();
  });

  it("calls archiveAdventure when Archive is clicked", async () => {
    renderRoute("/scenarios/s1/adventures");

    await screen.findByText("Active Adventure");
    const archiveBtn = screen.getAllByRole("button", { name: "Archive" })[0];
    await userEvent.click(archiveBtn);

    await waitFor(() => expect(api.archiveAdventure).toHaveBeenCalledWith("a1"));
  });

  it("calls deleteAdventure when Delete is clicked", async () => {
    renderRoute("/scenarios/s1/adventures");

    await screen.findByText("Active Adventure");
    const deleteBtns = screen.getAllByRole("button", { name: "Delete" });
    await userEvent.click(deleteBtns[0]);

    await waitFor(() => expect(api.deleteAdventure).toHaveBeenCalledWith("a1"));
  });
});

describe("ModelRow extraParameters edit", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listScenarios).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listAdventures).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listProviders).mockResolvedValue({ items: [{ id: "p1", ownerType: "user", name: "OpenRouter", providerType: "openrouter", protocol: "openai_chat_completions", baseUrl: "", isEnabled: true, hasCredential: true }], total: 1 });
    vi.mocked(api.listModels).mockResolvedValue({
      items: [{
        id: "m1", ownerType: "user" as const, providerConnectionId: "p1", providerName: "OpenRouter", providerType: "openai",
        displayName: "GPT-4o", modelId: "gpt-4o", contextWindow: 128000, userContextLimitDefault: 32000,
        visibleResponseTargetTokens: 350, temperature: 0.8, topP: 0.95, thinkingEnabled: false,
        isDefault: false, isEnabled: true, extraParameters: { max_tokens: 4096, stop: ["\n"] },
      }],
      total: 1,
    });
    vi.mocked(api.updateModel).mockResolvedValue({} as never);
  });

  it("initializes extraParameters textarea from model.extraParameters", async () => {
    renderRoute("/models");

    expect(await screen.findByText("GPT-4o")).toBeInTheDocument();
    // Open edit details
    await userEvent.click(screen.getByText("Edit Model"));

    // The textarea for extra parameters should show the formatted JSON from model.extraParameters
    const labels = screen.getAllByText("Extra Parameters JSON");
    expect(labels.length).toBeGreaterThan(0);
    const jsonTextarea = labels[0].closest("label")?.querySelector("textarea");
    expect(jsonTextarea).toBeTruthy();
    const parsed = JSON.parse((jsonTextarea as HTMLTextAreaElement).value);
    expect(parsed).toEqual({ max_tokens: 4096, stop: ["\n"] });
  });

  it("saves extraParameters through parseJsonObject when Save Model is clicked", async () => {
    renderRoute("/models");

    expect(await screen.findByText("GPT-4o")).toBeInTheDocument();
    await userEvent.click(screen.getByText("Edit Model"));

    const saveBtn = screen.getByRole("button", { name: "Save Model" });
    await userEvent.click(saveBtn);

    await waitFor(() => expect(api.updateModel).toHaveBeenCalled());
    const callArgs = vi.mocked(api.updateModel).mock.calls[0];
    expect(callArgs[0]).toBe("m1");
    const payload = callArgs[1] as Record<string, unknown>;
    expect(payload).toHaveProperty("extraParameters");
    expect((payload.extraParameters as Record<string, unknown>)).toEqual({ max_tokens: 4096, stop: ["\n"] });
  });
});

describe("AdventureCardEditor fields", () => {
  afterEach(() => cleanup());

  beforeEach(() => {
    vi.mocked(api.getMe).mockResolvedValue({ user: { id: "u1", nickname: "Admin", displayName: "Admin", role: "admin", isAdmin: true } });
    vi.mocked(api.availableModels).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listScenarios).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listAdventures).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.listStateEvents).mockResolvedValue({ items: [], total: 0 });
    vi.mocked(api.getAdventure).mockResolvedValue({
      id: "adv1", scenarioId: "s1", scenarioVersionId: "sv1", title: "Test Adventure", status: "active" as const,
      state: {
        modules: [],
        cards: [
          {
            id: "ac1", title: "Dragon Scale", cardType: "concept", summary: "A magical scale", content: "Iridescent",
            triggerWords: ["scale", "dragon"], activationMode: "triggered" as const, priority: 50, sortOrder: 0,
            isEnabled: true, useForCharacterCreation: false, tokenBudget: 200, metadata: { rarity: "legendary" },
          },
        ],
        currentModelConfigId: null, stateSequence: 1, timelineSequence: 1,
      },
      turns: [],
    });
    vi.mocked(api.updateAdventureCard).mockResolvedValue({} as never);
  });

  it("renders all card editor fields including cardType, summary, activationMode, priority, tokenBudget, metadata", async () => {
    renderRoute("/adventures/adv1");

    // Open the context panel in state mode via the State button
    const stateButton = await screen.findByRole("button", { name: "Open adventure state panel" });
    await userEvent.click(stateButton);

    // The Adventure State panel is now inside the context panel overlay
    // Find the <summary> element (not the <h2> header) to expand the details
    const stateSummaries = await screen.findAllByText("Adventure State");
    // The <summary> element is the one we want to click to expand
    const stateSummary = stateSummaries.find((el) => el.tagName === "SUMMARY")!;
    await userEvent.click(stateSummary);

    expect(await screen.findByDisplayValue("Dragon Scale")).toBeInTheDocument();
    expect(screen.getByText("Type")).toBeInTheDocument();
    expect(screen.getByText("Summary")).toBeInTheDocument();
    expect(screen.getByText("Activation Mode")).toBeInTheDocument();
    expect(screen.getByText("Priority")).toBeInTheDocument();
    expect(screen.getByText("Token Budget")).toBeInTheDocument();
    expect(screen.getByText("Character creation")).toBeInTheDocument();
    expect(screen.getByText("Metadata JSON")).toBeInTheDocument();
  });

  it("saves adventure card with metadata parsed via parseJsonObject", async () => {
    renderRoute("/adventures/adv1");

    // Open the context panel in state mode via the State button
    const stateButton = await screen.findByRole("button", { name: "Open adventure state panel" });
    await userEvent.click(stateButton);

    const stateSummaries = await screen.findAllByText("Adventure State");
    const stateSummary = stateSummaries.find((el) => el.tagName === "SUMMARY")!;
    await userEvent.click(stateSummary);

    await screen.findByDisplayValue("Dragon Scale");

    const saveBtn = screen.getByRole("button", { name: "Save Adventure Card" });
    await userEvent.click(saveBtn);

    await waitFor(() => expect(api.updateAdventureCard).toHaveBeenCalled());
    const callArgs = vi.mocked(api.updateAdventureCard).mock.calls[0];
    expect(callArgs[0]).toBe("adv1");
    expect(callArgs[1]).toBe("ac1");
    const payload = callArgs[2] as Record<string, unknown>;
    expect(payload).toHaveProperty("metadata");
    expect((payload as { metadata: Record<string, unknown> }).metadata).toEqual({ rarity: "legendary" });
    expect(payload).toHaveProperty("cardType", "concept");
    expect(payload).toHaveProperty("summary", "A magical scale");
    expect(payload).toHaveProperty("activationMode", "triggered");
    expect(payload).toHaveProperty("priority", 50);
    expect(payload).toHaveProperty("tokenBudget", 200);
    expect(payload).toHaveProperty("isEnabled", true);
    expect(payload).toHaveProperty("useForCharacterCreation", false);
  });
});
