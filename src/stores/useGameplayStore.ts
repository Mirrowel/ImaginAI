import { create } from 'zustand'
import type { Adventure } from '@/lib/api'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
}

interface GameplayState {
  activeAdventureId: number | null
  activeAdventure: Adventure | null
  messages: Message[]
  isGenerating: boolean
  streamingContent: string
  setActiveAdventureId: (id: number | null) => void
  setActiveAdventure: (adventure: Adventure | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setIsGenerating: (isGenerating: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (chunk: string) => void
}

export const useGameplayStore = create<GameplayState>((set) => ({
  activeAdventureId: null,
  activeAdventure: null,
  messages: [],
  isGenerating: false,
  streamingContent: '',
  setActiveAdventureId: (id) => set({ activeAdventureId: id }),
  setActiveAdventure: (adventure) => set({ activeAdventure: adventure, activeAdventureId: adventure?.id || null }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (chunk) => set((state) => ({ streamingContent: state.streamingContent + chunk })),
}))
