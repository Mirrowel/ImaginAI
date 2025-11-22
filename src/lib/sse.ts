/**
 * Stream SSE (Server-Sent Events) from backend endpoint.
 * Handles the backend format: data: {"chunk": "text"}
 * 
 * @param url - The SSE endpoint URL (POST request with JSON body)
 * @param options - Callbacks and abort signal
 */
export async function streamSSE(
  url: string,
  options: {
    onMessage: (chunk: string) => void
    onError: (error: Error) => void
    onComplete: () => void
    signal?: AbortSignal
    body?: Record<string, any>
  }
): Promise<void> {
  const { onMessage, onError, onComplete, signal, body } = options

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
      signal,
    })

    if (!response.ok) {
      throw new Error(`SSE request failed: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        onComplete()
        break
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete SSE messages (split by \n\n)
      const messages = buffer.split('\n\n')
      buffer = messages.pop() || '' // Keep incomplete message in buffer

      for (const message of messages) {
        if (!message.trim()) continue

        // Parse SSE data line
        const dataMatch = message.match(/^data: (.+)$/m)
        if (!dataMatch) continue

        const data = dataMatch[1]

        // Check for completion signal
        if (data === '[DONE]') {
          onComplete()
          return
        }

        try {
          // Parse JSON chunk: {"chunk": "text"} or {"error": "message"}
          const parsed = JSON.parse(data)
          
          if (parsed.error) {
            onError(new Error(parsed.error))
            return
          }
          
          if (parsed.chunk) {
            onMessage(parsed.chunk)
          }
        } catch (parseError) {
          console.warn('Failed to parse SSE data:', data, parseError)
        }
      }
    }
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        onComplete()
      } else {
        onError(error)
      }
    } else {
      onError(new Error('Unknown error during SSE streaming'))
    }
  }
}
