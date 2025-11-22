/**
 * API Service for ImaginAI Backend
 * Centralized API calls to Django REST Framework backend
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Helper for API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: response.statusText }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

// ============================================
// Scenarios API
// ============================================

export interface Scenario {
  id: number;
  name: string;
  instructions: string;
  plotEssentials: string;
  authorsNotes: string;
  openingScene: string;
  playerDescription: string;
  tags: string;
  visibility: string;
  created_at: string;
  updated_at: string;
}

export interface Card {
  id: string;
  title: string;
  card_type: string;
  trigger_words: string;
  short_description: string;
  full_content: string;
}

export const scenariosApi = {
  // List all scenarios
  list: () => apiRequest<Scenario[]>('/api/scenarios/'),

  // Get single scenario
  get: (id: number) => apiRequest<Scenario>(`/api/scenarios/${id}/`),

  // Create scenario
  create: (data: Partial<Scenario>) =>
    apiRequest<Scenario>('/api/scenarios/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Update scenario
  update: (id: number, data: Partial<Scenario>) =>
    apiRequest<Scenario>(`/api/scenarios/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Delete scenario
  delete: (id: number) =>
    apiRequest<void>(`/api/scenarios/${id}/`, {
      method: 'DELETE',
    }),

  // Duplicate scenario
  duplicate: (id: number) =>
    apiRequest<Scenario>(`/api/scenarios/${id}/duplicate/`, {
      method: 'POST',
    }),
};

// ============================================
// Adventures API
// ============================================

export interface Adventure {
  id: number;
  adventureName: string;
  sourceScenarioName: string;
  scenarioSnapshot: {
    name: string;
    instructions: string;
    plotEssentials: string;
    authorsNotes: string;
    openingScene: string;
    playerDescription: string;
    tags: string;
    visibility: string;
    cards: Card[];
  };
  createdAt: string;
  lastPlayedAt: string;
  adventureHistory: AdventureTurn[];
}

export interface AdventureTurn {
  id: number;
  role: 'user' | 'model';
  text: string;
  actionType: 'do' | 'say' | 'story';
  timestamp: string;
}

export const adventuresApi = {
  // List all adventures
  list: () => apiRequest<Adventure[]>('/api/adventures/'),

  // Get single adventure with history
  get: (id: number) => apiRequest<Adventure>(`/api/adventures/${id}/`),

  // Start new adventure from scenario
  start: (scenarioId: number, adventureName: string) =>
    apiRequest<Adventure>('/api/adventures/start/', {
      method: 'POST',
      body: JSON.stringify({
        scenario_id: scenarioId,
        adventure_name: adventureName,
      }),
    }),

  // Generate AI response (non-streaming)
  generateResponse: (
    adventureId: number,
    text: string,
    actionType: 'do' | 'say' | 'story',
    selectedModel?: string,
    maxTokens?: number
  ) =>
    apiRequest<AdventureTurn>(`/api/adventures/${adventureId}/generate-ai-response/`, {
      method: 'POST',
      body: JSON.stringify({
        text,
        actionType,
        selected_model: selectedModel || 'gemini/gemini-1.5-flash',
        global_max_output_tokens: maxTokens || 200,
      }),
    }),

  // Retry last AI response
  retry: (adventureId: number, selectedModel?: string, maxTokens?: number) =>
    apiRequest<AdventureTurn>(`/api/adventures/${adventureId}/retry-ai/`, {
      method: 'POST',
      body: JSON.stringify({
        selected_model: selectedModel || 'gemini/gemini-1.5-flash',
        global_max_output_tokens: maxTokens || 200,
      }),
    }),

  // Continue AI narration without user input
  continue: (adventureId: number, selectedModel?: string, maxTokens?: number) =>
    apiRequest<AdventureTurn>(`/api/adventures/${adventureId}/continue-ai/`, {
      method: 'POST',
      body: JSON.stringify({
        selected_model: selectedModel || 'gemini/gemini-1.5-flash',
        global_max_output_tokens: maxTokens || 200,
      }),
    }),

  // Update adventure
  update: (id: number, data: Partial<Adventure>) =>
    apiRequest<Adventure>(`/api/adventures/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Delete adventure
  delete: (id: number) =>
    apiRequest<void>(`/api/adventures/${id}/`, {
      method: 'DELETE',
    }),

  // Duplicate adventure
  duplicate: (id: number) =>
    apiRequest<Adventure>(`/api/adventures/${id}/duplicate/`, {
      method: 'POST',
    }),

  // Card management in snapshot
  addCard: (adventureId: number, card: Partial<Card>) =>
    apiRequest<{ status: string; card_id: string }>(
      `/api/adventures/${adventureId}/add-card-to-snapshot/`,
      {
        method: 'POST',
        body: JSON.stringify({ card }),
      }
    ),

  editCard: (adventureId: number, cardId: string, updatedCard: Partial<Card>) =>
    apiRequest<{ status: string }>(
      `/api/adventures/${adventureId}/edit-card-in-snapshot/`,
      {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId, updated_card: updatedCard }),
      }
    ),

  deleteCard: (adventureId: number, cardId: string) =>
    apiRequest<{ status: string }>(
      `/api/adventures/${adventureId}/delete-card-from-snapshot/`,
      {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId }),
      }
    ),

  duplicateCard: (adventureId: number, cardId: string) =>
    apiRequest<{ status: string; new_card_id: string }>(
      `/api/adventures/${adventureId}/duplicate-card-in-snapshot/`,
      {
        method: 'POST',
        body: JSON.stringify({ card_id: cardId }),
      }
    ),
};

// ============================================
// Models API
// ============================================

export interface AvailableModels {
  [provider: string]: string[];
}

export const modelsApi = {
  // List all available models
  list: () => apiRequest<string[]>('/api/models/'),

  // Get grouped models by provider
  grouped: () => apiRequest<AvailableModels>('/api/models/?grouped=true'),
};

// ============================================
// Cards API
// ============================================

export const cardsApi = {
  // List cards for a scenario
  list: (scenarioId: number) =>
    apiRequest<Card[]>(`/api/cards/?scenario=${scenarioId}`),

  // Create card
  create: (scenarioId: number, data: Partial<Card>) =>
    apiRequest<Card>('/api/cards/', {
      method: 'POST',
      body: JSON.stringify({ ...data, scenario: scenarioId }),
    }),

  // Update card
  update: (id: string, data: Partial<Card>) =>
    apiRequest<Card>(`/api/cards/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // Delete card
  delete: (id: string) =>
    apiRequest<void>(`/api/cards/${id}/`, {
      method: 'DELETE',
    }),
};

// Export all APIs
export const api = {
  scenarios: scenariosApi,
  adventures: adventuresApi,
  models: modelsApi,
  cards: cardsApi,
  turns: {
    delete: (id: number) => apiRequest<void>(`/adventureturns/${id}/`, { method: 'DELETE' }),
  },
};

export default api;
