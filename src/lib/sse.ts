/**
 * Utility for handling Server-Sent Events (SSE) streaming.
 * Supports standard SSE format and custom event types.
 */

export type SSEEvent = {
  type: string
  data: string
}

export type SSEOptions = {
  onMessage: (data: string) => void
  onError?: (error: Event) => void
  onComplete?: () => void
  signal?: AbortSignal
}

export async function streamSSE(url: string, options: SSEOptions) {
  const { onMessage, onError, onComplete, signal } = options

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'text/event-stream',
      },
      signal,
    })

    if (!response.ok) {
      throw new Error(`SSE Error: ${response.status} ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) {
      throw new Error('Failed to get reader from response body')
    }

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        onComplete?.()
        break
      }

      const chunk = decoder.decode(value, { stream: true })
      const lines = chunk.split('\n')

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6)
          if (data === '[DONE]') {
            onComplete?.()
            return
          }
          try {
            // Try to parse as JSON if possible, otherwise pass raw string
            // For simple text streaming, we might just get raw text or JSON wrapped text
            // Adjust based on backend format. Assuming JSON for now based on typical patterns.
            const parsed = JSON.parse(data)
             // If backend sends { content: "..." }
            if (parsed.content) {
                onMessage(parsed.content)
            } else {
                // Fallback or other fields
                onMessage(data)
            }
          } catch (e) {
            // If not JSON, just pass the raw data string
            onMessage(data)
          }
        }
      }
    }
  } catch (error) {
    if (signal?.aborted) {
      console.log('Stream aborted')
      return
    }
    console.error('SSE Stream Error:', error)
    onError?.(error as Event)
  }
}
