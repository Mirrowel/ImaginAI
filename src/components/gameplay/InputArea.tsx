import { useState, useRef, useEffect } from 'react'
import { Send, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useGameplayStore } from '@/stores/useGameplayStore'

export function InputArea() {
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isGenerating, activeAdventureId } = useGameplayStore()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [input])

  const handleSubmit = () => {
    if (!input.trim() || isGenerating) return
    
    // TODO: Call API to send message
    console.log('Sending:', input)
    setInput('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="max-w-3xl mx-auto relative flex gap-2 items-end">
        <div className="relative flex-1">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="What do you do?"
            className="min-h-[50px] max-h-[200px] pr-12 resize-none py-3"
            disabled={isGenerating || !activeAdventureId}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-2 h-8 w-8 text-muted-foreground hover:text-foreground"
          >
            <Mic size={18} />
            <span className="sr-only">Voice input</span>
          </Button>
        </div>
        <Button 
          onClick={handleSubmit} 
          disabled={!input.trim() || isGenerating || !activeAdventureId}
          size="icon"
          className="h-[50px] w-[50px] shrink-0"
        >
          <Send size={20} />
          <span className="sr-only">Send message</span>
        </Button>
      </div>
    </div>
  )
}
