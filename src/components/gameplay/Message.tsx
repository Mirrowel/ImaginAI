import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { User, Bot, Edit2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface MessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  isStreaming?: boolean
  onEdit?: () => void
}

export function Message({ role, content, timestamp, isStreaming, onEdit }: MessageProps) {
  return (
    <div className={cn(
      "flex gap-4 p-4 rounded-lg transition-colors",
      role === 'assistant' ? "bg-muted/50" : "bg-background"
    )}>
      <Avatar className="h-8 w-8 mt-1">
        <AvatarFallback className={role === 'assistant' ? "bg-primary text-primary-foreground" : "bg-secondary"}>
          {role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-2 overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">
            {role === 'assistant' ? 'AI Storyteller' : 'You'}
          </span>
          <div className="flex items-center gap-2">
            {timestamp && (
              <span className="text-xs text-muted-foreground">
                {new Date(timestamp).toLocaleTimeString()}
              </span>
            )}
            {role === 'user' && onEdit && (
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onEdit}>
                <Edit2 size={12} />
                <span className="sr-only">Edit message</span>
              </Button>
            )}
          </div>
        </div>
        
        <div className="prose prose-invert max-w-none text-sm leading-relaxed break-words">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse align-middle" />
          )}
        </div>
      </div>
    </div>
  )
}
