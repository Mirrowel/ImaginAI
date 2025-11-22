import { useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ChatLog } from '@/components/gameplay/ChatLog'
import { InputArea } from '@/components/gameplay/InputArea'
import { Sidebar } from '@/components/gameplay/Sidebar'
import { useUIStore } from '@/stores/useUIStore'
import { useGameplayStore } from '@/stores/useGameplayStore'
import { useSettingsStore } from '@/stores/useSettingsStore'
import { useStreaming } from '@/hooks/useStreaming'
import api, { type AdventureTurn } from '@/lib/api'
import { toast } from 'sonner'

export default function Gameplay() {
  const { id } = useParams()
  const { toggleSidebar, isSidebarOpen } = useUIStore()
  const { 
    setActiveAdventureId,
    setActiveAdventure, 
    setMessages, 
    addMessage, 
    messages,
    setIsGenerating,
    setStreamingContent,
    appendStreamingContent
  } = useGameplayStore()
  const { selectedModel } = useSettingsStore()
  
  const { 
    startStream, 
    isStreaming, 
    streamedContent, 
    error: streamError 
  } = useStreaming()

  // Sync streaming state with store
  useEffect(() => {
    setIsGenerating(isStreaming)
  }, [isStreaming, setIsGenerating])

  useEffect(() => {
    setStreamingContent(streamedContent)
  }, [streamedContent, setStreamingContent])

  useEffect(() => {
    if (streamError) {
      toast.error(`Streaming error: ${streamError.message}`)
    }
  }, [streamError])

  // Fetch adventure data
  useEffect(() => {
    if (!id) return

    const adventureId = parseInt(id)
    setActiveAdventureId(adventureId)

    const fetchAdventure = async () => {
      try {
        const adventure = await api.adventures.get(adventureId)
        setActiveAdventure(adventure)
        
        // Map API turns to store messages
        const mappedMessages = adventure.adventureHistory.map((turn: AdventureTurn) => ({
          id: turn.id.toString(),
          role: turn.role === 'model' ? 'assistant' : 'user',
          content: turn.text,
          timestamp: turn.timestamp
        }))
        
        setMessages(mappedMessages as any) // Type assertion needed due to role mismatch in store definition vs mapped
      } catch (error) {
        console.error('Failed to load adventure:', error)
        toast.error('Failed to load adventure')
      }
    }

    fetchAdventure()
    
    return () => setActiveAdventureId(null)
  }, [id, setActiveAdventureId, setActiveAdventure, setMessages])

  const handleContinue = useCallback(async () => {
    if (!id) return
    const adventureId = parseInt(id)
    
    try {
      await startStream(adventureId, {
        text: undefined, // No text for continue
        actionType: 'story',
        selectedModel
      })
    } catch (error) {
      console.error('Failed to continue story:', error)
      toast.error('Failed to continue story')
    }
  }, [id, startStream, selectedModel])

  const handleSubmit = useCallback(async (text: string) => {
    if (!id) return
    const adventureId = parseInt(id)

    // Optimistically add user message
    addMessage({
      id: `temp-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toISOString()
    })

    try {
      await startStream(adventureId, {
        text,
        actionType: 'do', // Default action type
        selectedModel
      })
    } catch (error) {
      console.error('Failed to send message:', error)
      toast.error('Failed to send message')
    }
  }, [id, startStream, selectedModel, addMessage])

  const handleRetry = useCallback(async () => {
    if (!id || messages.length === 0) return
    const adventureId = parseInt(id)

    // Find last assistant message
    const lastMessage = messages[messages.length - 1]
    if (lastMessage.role !== 'assistant') {
      toast.error('Can only retry the last AI response')
      return
    }

    try {
      // Delete the last turn from backend
      await api.turns.delete(parseInt(lastMessage.id))
      
      // Remove from local store (reload messages to be safe or just pop)
      // For now, let's just reload the adventure to ensure sync
      const adventure = await api.adventures.get(adventureId)
      const mappedMessages = adventure.adventureHistory.map((turn: AdventureTurn) => ({
        id: turn.id.toString(),
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: turn.text,
        timestamp: turn.timestamp
      }))
      setMessages(mappedMessages as any)

      // Start streaming (retry logic: just continue from previous state? 
      // OR does the user want to change their input? 
      // Usually retry means "try again with same input" or "try again" if it was a continue.
      // If the previous turn was user, we just want to generate response again.
      // If the previous turn was AI, we deleted it. Now the last turn is User (or AI if it was a continue).
      // So we just call continue/generate with empty text, effectively regenerating the response.)
      
      await startStream(adventureId, {
        text: undefined, // Let backend decide based on history
        actionType: 'story', // Or 'do'? 'story' is safer for generation without input
        selectedModel
      })
      
    } catch (error) {
      console.error('Failed to retry:', error)
      toast.error('Failed to retry')
    }
  }, [id, messages, startStream, selectedModel, setMessages])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b flex items-center px-4 gap-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <Button variant="ghost" size="icon" onClick={toggleSidebar} className={isSidebarOpen ? 'md:hidden' : ''}>
            <Menu size={20} />
            <span className="sr-only">Toggle sidebar</span>
          </Button>
          <div className="font-semibold md:hidden">ImaginAI</div>
        </header>

        <main className="flex-1 flex flex-col min-h-0 relative">
          <ChatLog onRetry={handleRetry} />
          <InputArea onContinue={handleContinue} onSubmit={handleSubmit} />
        </main>
      </div>
    </div>
  )
}
