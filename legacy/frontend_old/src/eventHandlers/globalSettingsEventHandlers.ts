// src/eventHandlers/globalSettingsEventHandlers.ts
import * as Rstate from '../state';
import { renderApp } from '../viewManager';
import type { GlobalSettings, AvailableTextModel } from '../types';

export async function handleSaveGlobalSettings() { // Made async to await fetch
    const form = document.getElementById('global-settings-form') as HTMLFormElement;
    if (!form) return;

    const formData = new FormData(form);
    const responseHandling = formData.get('responseHandlingStrategy') as GlobalSettings['responseHandlingStrategy'];
    const allowThinking = (formData.get('allowAiThinking') === 'on');
    const maxTokens = parseInt(formData.get('globalMaxOutputTokens') as string, 10);
    const model = formData.get('selectedModel') as AvailableTextModel;

    const settingsToSave: Partial<GlobalSettings> = {
        responseHandlingStrategy: responseHandling,
        allowAiThinking: allowThinking,
        globalMaxOutputTokens: maxTokens,
        selectedModel: model,
    };

    try {
        // The backend endpoint for the singleton GlobalSettings is /api/global-settings/
        const response = await fetch('/api/global-settings/', {
            method: 'PUT', // Use PUT to replace the settings object
            headers: {
                'Content-Type': 'application/json',
                // Include CSRF token if necessary for Django backend
                // 'X-CSRFToken': getCookie('csrftoken'), // You might need a helper to get the CSRF token
            },
            body: JSON.stringify(settingsToSave),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to save global settings:', response.status, errorData);
            alert(`Failed to save settings: ${errorData.detail || JSON.stringify(errorData)}`);
            return; // Stop if save failed
        }

        // Update frontend state only after successful backend save
        Rstate.updateGlobalSettings(settingsToSave);
        // saveGlobalSettingsToStorage(); // Remove local storage save
        Rstate.setGlobalSettingsVisible(false);
        renderApp();

    } catch (error) {
        console.error('Error saving global settings:', error);
        alert('An error occurred while trying to save settings.');
    }
}

// Helper function to get CSRF token (if needed)
// function getCookie(name: string) {
//     let cookieValue = null;
//     if (document.cookie && document.cookie !== '') {
//         const cookies = document.cookie.split(';');
//         for (let i = 0; i < cookies.length; i++) {
//             const cookie = cookies[i].trim();
//             // Does this cookie string begin with the name we want?
//             if (cookie.substring(0, name.length + 1) === (name + '=')) {
//                 cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
//                 break;
//             }
//         }
//     }
//     return cookieValue;
// }
