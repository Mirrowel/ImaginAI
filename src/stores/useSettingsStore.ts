import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  selectedModel: string
  apiKey: string | null
  setSelectedModel: (model: string) => void
  setApiKey: (key: string) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      selectedModel: 'gemini/gemini-1.5-flash', // Default model
      apiKey: null,
      setSelectedModel: (model) => set({ selectedModel: model }),
      setApiKey: (key) => set({ apiKey: key }),
    }),
    {
      name: 'imaginai-settings',
    }
  )
)
