import { create } from "zustand";
import { persist } from "zustand/middleware";

type UiState = {
  actionType: "do" | "say" | "story";
  setActionType: (actionType: "do" | "say" | "story") => void;
  selectedModelId: string | null;
  setSelectedModelId: (selectedModelId: string | null) => void;
  theme: "dark" | "system";
  setTheme: (theme: "dark" | "system") => void;
  showThinkingDefault: boolean;
  setShowThinkingDefault: (showThinkingDefault: boolean) => void;
  streamThinking: boolean;
  setStreamThinking: (streamThinking: boolean) => void;
  debugPanelsDefaultOpen: boolean;
  setDebugPanelsDefaultOpen: (debugPanelsDefaultOpen: boolean) => void;
  textStreamingEnabled: boolean;
  setTextStreamingEnabled: (textStreamingEnabled: boolean) => void;
  sidebarSize: "compact" | "comfortable";
  setSidebarSize: (sidebarSize: "compact" | "comfortable") => void;
  editorLayout: "stacked" | "split";
  setEditorLayout: (editorLayout: "stacked" | "split") => void;
  contextPanelOpen: boolean;
  setContextPanelOpen: (open: boolean) => void;
  contextPanelMode: "state" | "fork" | "retry" | "inspect" | "streaming";
  setContextPanelMode: (mode: "state" | "fork" | "retry" | "inspect" | "streaming") => void;
  contextPanelTurnId: string | null;
  setContextPanelTurnId: (id: string | null) => void;
  scenarioEditorTab: "metadata" | "modules" | "cards" | "versions";
  setScenarioEditorTab: (tab: "metadata" | "modules" | "cards" | "versions") => void;
};

/** Local UI/gameplay state and durable preferences that should not be backend-owned. */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      actionType: "do",
      setActionType: (actionType) => set({ actionType }),
      selectedModelId: null,
      setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
      theme: "dark",
      setTheme: (theme) => set({ theme }),
      showThinkingDefault: false,
      setShowThinkingDefault: (showThinkingDefault) => set({ showThinkingDefault }),
      streamThinking: false,
      setStreamThinking: (streamThinking) => set({ streamThinking }),
      debugPanelsDefaultOpen: false,
      setDebugPanelsDefaultOpen: (debugPanelsDefaultOpen) => set({ debugPanelsDefaultOpen }),
      textStreamingEnabled: true,
      setTextStreamingEnabled: (textStreamingEnabled) => set({ textStreamingEnabled }),
      sidebarSize: "comfortable",
      setSidebarSize: (sidebarSize) => set({ sidebarSize }),
      editorLayout: "stacked",
      setEditorLayout: (editorLayout) => set({ editorLayout }),
      contextPanelOpen: false,
      setContextPanelOpen: (contextPanelOpen) => set({ contextPanelOpen }),
      contextPanelMode: "state",
      setContextPanelMode: (contextPanelMode) => set({ contextPanelMode }),
      contextPanelTurnId: null,
      setContextPanelTurnId: (contextPanelTurnId) => set({ contextPanelTurnId }),
      scenarioEditorTab: "metadata",
      setScenarioEditorTab: (scenarioEditorTab) => set({ scenarioEditorTab }),
    }),
    { name: "imaginai-ui-preferences" },
  ),
);
