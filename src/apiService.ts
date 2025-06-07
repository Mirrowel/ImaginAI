// src/apiService.ts
import type { Scenario, Adventure, GlobalSettings, AdventureTurn, ActionType, ModelInfo, AvailableTextModel } from './types';

const API_BASE_URL = '/api';

async function fetchAPI(url: string, options: RequestInit = {}) {
    const fullUrl = `${API_BASE_URL}${url}`;
    try {
        const response = await fetch(fullUrl, options);
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`API Error on ${fullUrl}:`, response.status, errorText);
            throw new Error(`Failed to fetch ${fullUrl}: ${response.statusText}`);
        }
        // Handle cases where the response might be empty (e.g., 204 No Content)
        if (response.status === 204) {
            return null;
        }
        return response.json();
    } catch (error) {
        console.error(`Network or other error on ${fullUrl}:`, error);
        throw error;
    }
}

// Scenario Endpoints
export const getScenarios = (): Promise<Scenario[]> => fetchAPI('/scenarios/');
export const getScenario = (id: string): Promise<Scenario> => fetchAPI(`/scenarios/${id}/`);
export const createScenario = (scenario: Partial<Scenario>): Promise<Scenario> => fetchAPI('/scenarios/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
});
export const updateScenario = (id: string, scenario: Scenario): Promise<Scenario> => fetchAPI(`/scenarios/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario),
});
export const deleteScenario = (id: string): Promise<null> => fetchAPI(`/scenarios/${id}/`, { method: 'DELETE' });
export const duplicateScenario = (id: string): Promise<Scenario> => fetchAPI(`/scenarios/${id}/duplicate_scenario/`, { method: 'POST' });
export const exportScenario = (id: string): Promise<Scenario> => fetchAPI(`/scenarios/${id}/export_scenario/`, { method: 'GET' });

// Adventure Endpoints
export const getAdventures = (): Promise<Adventure[]> => fetchAPI('/adventures/');
export const getAdventure = (id: string): Promise<Adventure> => fetchAPI(`/adventures/${id}/`);
export const createAdventure = (adventure: Partial<Adventure>): Promise<Adventure> => fetchAPI('/adventures/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adventure),
});
export const updateAdventure = (id: string, adventure: Adventure): Promise<Adventure> => fetchAPI(`/adventures/${id}/`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(adventure),
});
export const deleteAdventure = (id: string): Promise<null> => fetchAPI(`/adventures/${id}/`, { method: 'DELETE' });

// AI Generation Endpoints
interface AISettings {
    selectedModel: AvailableTextModel;
    globalMaxOutputTokens: number;
    allowAiThinking: boolean;
}

export const generateNextTurn = (adventureId: string, playerAction: { text: string; actionType: ActionType }, settings: AISettings): Promise<AdventureTurn> => {
    const payload = {
        ...playerAction,
        selected_model: `models/${settings.selectedModel}`,
        global_max_output_tokens: settings.globalMaxOutputTokens,
        allow_ai_thinking: settings.allowAiThinking,
    };
    return fetchAPI(`/adventures/${adventureId}/generate_ai_response/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
};

export const continueAI = (adventureId: string, settings: AISettings): Promise<AdventureTurn> => {
    const payload = {
        selected_model: `models/${settings.selectedModel}`,
        global_max_output_tokens: settings.globalMaxOutputTokens,
        allow_ai_thinking: settings.allowAiThinking,
    };
    return fetchAPI(`/adventures/${adventureId}/continue_ai/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
};

export const retryAI = (adventureId: string, settings: AISettings): Promise<AdventureTurn> => {
    const payload = {
        selected_model: `models/${settings.selectedModel}`,
        global_max_output_tokens: settings.globalMaxOutputTokens,
        allow_ai_thinking: settings.allowAiThinking,
    };
    return fetchAPI(`/adventures/${adventureId}/retry_ai/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
    });
};

// Global Settings Endpoints
export const getGlobalSettings = (): Promise<GlobalSettings> => fetchAPI('/global-settings/');
export const updateGlobalSettings = (settings: GlobalSettings): Promise<GlobalSettings> => fetchAPI('/global-settings/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
});

// Model Info Endpoints
export const getModelInputLimits = (thinkingOnly: boolean = false): Promise<Record<string, ModelInfo>> => {
    const url = thinkingOnly ? '/model-input-limits/?thinking=true' : '/model-input-limits/';
    return fetchAPI(url);
};
export const getSpecificModelInputLimit = (modelName: string): Promise<{ limit: number }> => fetchAPI(`/model-input-limits/${modelName}/`);
export const getDefaultModels = (): Promise<{ default_non_thinking: string, default_thinking: string }> => fetchAPI('/default-models/');
