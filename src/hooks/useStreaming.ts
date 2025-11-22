/**
 * React hook for SSE streaming from Django backend
 * Integrates with the existing sse.ts utility
 */

import { useCallback, useRef, useState } from 'react';
import { streamSSE } from '../lib/sse';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export interface StreamOptions {
  text?: string;
  actionType?: 'do' | 'say' | 'story';
  selectedModel?: string;
  maxTokens?: number;
}

export interface UseStreamingResult {
  streamedContent: string;
  isStreaming: boolean;
  error: Error | null;
  startStream: (adventureId: number, options?: StreamOptions) => Promise<void>;
  stopStream: () => void;
  resetContent: () => void;
}

/**
 * Hook for streaming AI responses from the backend
 * 
 * @example
 * const { streamedContent, isStreaming, startStream, error } = useStreaming();
 * 
 * // Start streaming
 * await startStream(adventureId, {
 *   text: userInput,
 *   actionType: 'do',
 *   selectedModel: 'gemini/gemini-1.5-flash'
 * });
 */
export function useStreaming(): UseStreamingResult {
  const [streamedContent, setStreamedContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (
    adventureId: number,
    options: StreamOptions = {}
  ) => {
    // Reset state
    setStreamedContent('');
    setError(null);
    setIsStreaming(true);

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController();

    const url = `${API_BASE_URL}/api/adventures/${adventureId}/stream/`;
    const body = {
      text: options.text || null,
      action_type: options.actionType || 'do',
      selected_model: options.selectedModel || 'gemini/gemini-1.5-flash',
      max_tokens: options.maxTokens || 200,
    };

    try {
      await streamSSE(url, {
        body,
        signal: abortControllerRef.current.signal,
        onMessage: (chunk) => {
          setStreamedContent((prev) => prev + chunk);
        },
        onError: (err) => {
          setError(err);
          setIsStreaming(false);
        },
        onComplete: () => {
          setIsStreaming(false);
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err);
      }
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const resetContent = useCallback(() => {
    setStreamedContent('');
    setError(null);
  }, []);

  return {
    streamedContent,
    isStreaming,
    error,
    startStream,
    stopStream,
    resetContent,
  };
}
