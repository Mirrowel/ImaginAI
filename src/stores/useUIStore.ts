import { create } from 'zustand'

interface UIState {
  isSidebarOpen: boolean
  activeModal: 'settings' | 'createScenario' | null
  toggleSidebar: () => void
  openModal: (modal: 'settings' | 'createScenario') => void
  closeModal: () => void
}

export const useUIStore = create<UIState>((set) => ({
  isSidebarOpen: true,
  activeModal: null,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  openModal: (modal) => set({ activeModal: modal }),
  closeModal: () => set({ activeModal: null }),
}))
