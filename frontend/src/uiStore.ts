import { create } from "zustand";

type UiState = {
  actionType: "do" | "say" | "story";
  setActionType: (actionType: "do" | "say" | "story") => void;
  selectedModelId: string | null;
  setSelectedModelId: (selectedModelId: string | null) => void;
};

/** Local UI/gameplay state that should not be owned by the backend. */
export const useUiStore = create<UiState>((set) => ({
  actionType: "do",
  setActionType: (actionType) => set({ actionType }),
  selectedModelId: null,
  setSelectedModelId: (selectedModelId) => set({ selectedModelId }),
}));
