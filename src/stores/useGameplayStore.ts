import { create } from 'zustand'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
}

interface GameplayState {
  activeAdventureId: number | null
  messages: Message[]
  isGenerating: boolean
  streamingContent: string
  setActiveAdventure: (id: number | null) => void
  setMessages: (messages: Message[]) => void
  addMessage: (message: Message) => void
  setIsGenerating: (isGenerating: boolean) => void
  setStreamingContent: (content: string) => void
  appendStreamingContent: (chunk: string) => void
}

export const useGameplayStore = create<GameplayState>((set) => ({
  activeAdventureId: null,
  messages: [],
  isGenerating: false,
  streamingContent: '',
  setActiveAdventure: (id) => set({ activeAdventureId: id }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  setIsGenerating: (isGenerating) => set({ isGenerating }),
  setStreamingContent: (content) => set({ streamingContent: content }),
  appendStreamingContent: (chunk) => set((state) => ({ streamingContent: state.streamingContent + chunk })),
}))
