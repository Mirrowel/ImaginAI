import { useState, useRef, useCallback } from 'react'
import { streamSSE } from '@/lib/sse'
import { useGameplayStore } from '@/stores/useGameplayStore'

interface UseLLMStreamReturn {
  startStream: (url: string, body?: Record<string, any>) => Promise<void>
  stopStream: () => void
  isStreaming: boolean
  error: Error | null
}

export function useLLMStream(): UseLLMStreamReturn {
  const [isStreaming, setIsStreaming] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  
  const { setStreamingContent, appendStreamingContent, setIsGenerating } = useGameplayStore()

  const startStream = useCallback(async (url: string, body?: Record<string, any>) => {
    // Reset state
    setIsStreaming(true)
    setIsGenerating(true)
    setError(null)
    setStreamingContent('')
    
    // Cancel previous stream if any
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    const abortController = new AbortController()
    abortControllerRef.current = abortController

    await streamSSE(url, {
      body, // Pass request body for POST
      onMessage: (chunk) => {
        appendStreamingContent(chunk)
      },
      onError: (err) => {
        setError(err as unknown as Error)
        setIsStreaming(false)
        setIsGenerating(false)
      },
      onComplete: () => {
        setIsStreaming(false)
        setIsGenerating(false)
        abortControllerRef.current = null
      },
      signal: abortController.signal,
    })
  }, [appendStreamingContent, setIsGenerating, setStreamingContent])

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
      setIsStreaming(false)
      setIsGenerating(false)
    }
  }, [setIsGenerating])

  return {
    startStream,
    stopStream,
    isStreaming,
    error,
  }
}
