// src/settingsService.ts
import * as state from './state';
import * as api from './apiService';
import type { GlobalSettings, AvailableTextModel } from './types';
import { AVAILABLE_TEXT_MODELS } from './types';

export async function fetchGlobalSettingsFromAPI() {
    try {
        const settingsData = await api.getGlobalSettings();

        // Update frontend state with settings from the backend
        state.updateGlobalSettings({
            responseHandlingStrategy: settingsData.responseHandlingStrategy,
            allowAiThinking: settingsData.allowAiThinking,
            globalMaxOutputTokens: settingsData.globalMaxOutputTokens,
            selectedModel: settingsData.selectedModel,
        });

    } catch (error) {
        console.error("Error fetching global settings from API:", error);
        // Optionally set default state or show an error to the user
    }
}

export async function saveGlobalSettingsToAPI(settings: GlobalSettings): Promise<void> {
    try {
        await api.updateGlobalSettings(settings);
    } catch (error) {
        console.error("Error saving global settings to API:", error);
    }
}
