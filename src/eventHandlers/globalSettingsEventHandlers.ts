
// src/eventHandlers/globalSettingsEventHandlers.ts
import * as Rstate from '../state';
import { saveGlobalSettingsToStorage } from '../storage';
import { renderApp } from '../viewManager';
import type { GlobalSettings, AvailableTextModel } from '../types';

export function handleSaveGlobalSettings() {
    const form = document.getElementById('global-settings-form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const responseHandling = formData.get('responseHandlingStrategy') as GlobalSettings['responseHandlingStrategy'];
    const allowThinking = (formData.get('allowAiThinking') === 'on'); 
    const maxTokens = parseInt(formData.get('globalMaxOutputTokens') as string, 10);
    const model = formData.get('selectedModel') as AvailableTextModel;

    Rstate.updateGlobalSettings({
        responseHandlingStrategy: responseHandling,
        allowAiThinking: allowThinking,
        globalMaxOutputTokens: maxTokens,
        selectedModel: model,
    });
    saveGlobalSettingsToStorage();
    Rstate.setGlobalSettingsVisible(false);
    renderApp(); 
}
