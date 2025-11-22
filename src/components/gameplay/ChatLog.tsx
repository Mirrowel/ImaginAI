import { useEffect, useRef } from 'react'
import { Message } from './Message'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useGameplayStore } from '@/stores/useGameplayStore'

export function ChatLog() {
  const { messages, isGenerating, streamingContent } = useGameplayStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive or streaming updates
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, streamingContent])

  return (
    <ScrollArea className="flex-1 h-full p-4">
      <div className="space-y-4 max-w-3xl mx-auto pb-4">
        {messages.map((msg) => (
          <Message
            key={msg.id}
            role={msg.role}
            content={msg.content}
            timestamp={msg.timestamp}
            onEdit={() => console.log('Edit message', msg.id)} // TODO: Implement edit logic
          />
        ))}
        
        {isGenerating && (
          <Message
            role="assistant"
            content={streamingContent}
            isStreaming={true}
          />
        )}
        
        <div ref={bottomRef} />
      </div>
    </ScrollArea>
  )
}
