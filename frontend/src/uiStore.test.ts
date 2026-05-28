import { describe, expect, it } from "vitest";
import { useUiStore } from "./uiStore";

describe("useUiStore", () => {
  it("stores gameplay UI state and persistent preference fields", () => {
    useUiStore.getState().setActionType("say");
    useUiStore.getState().setSelectedModelId("model-1");
    useUiStore.getState().setDebugPanelsDefaultOpen(true);

    expect(useUiStore.getState().actionType).toBe("say");
    expect(useUiStore.getState().selectedModelId).toBe("model-1");
    expect(useUiStore.getState().debugPanelsDefaultOpen).toBe(true);
    expect(useUiStore.getState().textStreamingEnabled).toBe(true);
  });
});
