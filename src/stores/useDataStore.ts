import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Placeholder types until we have the full type definitions
export interface Scenario {
  id: number
  name: string
  instructions: string
  plot_essentials: string
  authors_notes: string
  created_at: string
  updated_at: string
}

export interface Adventure {
  id: number
  adventure_name: string
  source_scenario_name: string
  created_at: string
  last_played_at: string
}

interface DataState {
  scenarios: Scenario[]
  adventures: Adventure[]
  setScenarios: (scenarios: Scenario[]) => void
  setAdventures: (adventures: Adventure[]) => void
  addScenario: (scenario: Scenario) => void
  addAdventure: (adventure: Adventure) => void
}

export const useDataStore = create<DataState>()(
  persist(
    (set) => ({
      scenarios: [],
      adventures: [],
      setScenarios: (scenarios) => set({ scenarios }),
      setAdventures: (adventures) => set({ adventures }),
      addScenario: (scenario) => set((state) => ({ scenarios: [...state.scenarios, scenario] })),
      addAdventure: (adventure) => set((state) => ({ adventures: [...state.adventures, adventure] })),
    }),
    {
      name: 'imaginai-data-storage',
    }
  )
)
