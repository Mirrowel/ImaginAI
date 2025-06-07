
// src/ui/settingsRenderer.ts
import * as state from '../state';
import { escapeHTML } from '../utils'; 
import { handleSaveGlobalSettings } from '../eventHandlers/index';
import { renderApp } from '../viewManager';
import { AvailableTextModel } from '../types';
import { fetchAndStoreModelInputLimits } from '../modelInfoService';

export function renderSettingsModal() {
    const modalContainer = document.getElementById('settings-modal-container');
    if (!modalContainer) return;

    if (!state.globalSettingsVisible) {
        modalContainer.innerHTML = '';
        return;
    }

    const modelsForDropdown = state.availableModels;

    modalContainer.innerHTML = `
        <div class="settings-modal-overlay" id="settings-modal-overlay" role="dialog" aria-modal="true" aria-labelledby="settings-modal-heading">
            <div class="settings-modal">
                <h2 id="settings-modal-heading">Application Settings</h2>
                <form id="global-settings-form">
                    <div class="form-group">
                        <label for="selected-ai-model">AI Model:</label>
                        <select id="selected-ai-model" name="selectedModel">
                            ${modelsForDropdown.map(model => `
                                <option value="${model.id}" ${state.selectedModel === model.id ? 'selected' : ''}>${escapeHTML(model.name)}</option>
                            `).join('')}
                            ${modelsForDropdown.length === 0 ? '<option value="" disabled>No models available.</option>' : ''}
                        </select>
                    </div>
                
                    <div class="form-group">
                        <label>Response Handling Strategy:</label>
                        <div class="settings-group">
                            <input type="radio" id="response-truncate" name="responseHandlingStrategy" value="truncate" ${state.responseHandlingStrategy === 'truncate' ? 'checked' : ''}>
                            <label for="response-truncate">Truncate (Cut off at limit, end at last sentence)</label>
                        </div>
                        <div class="settings-group">
                            <input type="radio" id="response-summarize" name="responseHandlingStrategy" value="summarize" ${state.responseHandlingStrategy === 'summarize' ? 'checked' : ''}>
                            <label for="response-summarize">Summarize (Use AI to shorten if over limit)</label>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>AI Thinking:</label>
                         <div class="settings-group">
                            <input type="checkbox" id="allow-ai-thinking" name="allowAiThinking" ${state.allowAiThinking ? 'checked' : ''}>
                            <label for="allow-ai-thinking">Allow dedicated AI thinking time (Higher quality, potentially slower. Limits model selection.)</label>
                        </div>
                        <p style="font-size: 0.85em; color: #aaa; margin-top: 0.3em;">
                            If checked, model selection is limited to those with explicit thinking configuration (e.g., <code>gemini-2.5-flash-preview-04-17</code>, <code>gemini-2.5-flash-preview-05-20</code>).
                            If unchecked for these models, a specific instruction (<code>thinkingBudget: 0</code>) is sent to reduce latency.
                            For other models, this setting might influence token limits but not a direct thinking configuration.
                        </p>
                    </div>

                    <div class="form-group">
                        <label for="global-max-output-tokens">Global AI Output Text Token Limit (50-800):</label>
                        <input type="number" id="global-max-output-tokens" name="globalMaxOutputTokens" value="${state.globalMaxOutputTokens}" min="50" max="800" required>
                        <p style="font-size: 0.85em; color: #aaa; margin-top: 0.3em;">Defines the target length for AI-generated text. Responses longer than this (plus a small buffer) will be processed based on the strategy above.</p>
                    </div>

                    <div class="form-group" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid var(--border-color);">
                        <label for="base-system-instruction-display" style="font-weight: bold;">Base System Instruction (Read-only):</label>
                        <p id="base-system-instruction-display" style="background-color: var(--surface-color); padding: 0.8rem; border-radius: var(--border-radius); font-size: 0.9em; line-height: 1.5; white-space: pre-wrap; word-break: break-word; border: 1px solid var(--border-color);">
                            ${escapeHTML(state.BASE_SYSTEM_INSTRUCTION)}
                        </p>
                         <p style="font-size: 0.85em; color: #aaa; margin-top: 0.3em;">This instruction is prepended to all scenario-specific AI instructions to guide general AI behavior and seamless continuation.</p>
                    </div>


                    <div class="settings-modal-actions">
                        <button type="button" id="cancel-settings-btn" class="secondary">Cancel</button>
                        <button type="submit" id="save-settings-btn">Save Settings</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('global-settings-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        handleSaveGlobalSettings();
    });
    document.getElementById('cancel-settings-btn')?.addEventListener('click', () => {
        state.setGlobalSettingsVisible(false);
        renderApp();
    });
     document.getElementById('settings-modal-overlay')?.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) { 
            state.setGlobalSettingsVisible(false);
            renderApp();
        }
    });

    const allowThinkingCheckbox = document.getElementById('allow-ai-thinking') as HTMLInputElement;
    if (allowThinkingCheckbox) {
        allowThinkingCheckbox.addEventListener('change', async () => {
            const isChecked = allowThinkingCheckbox.checked;
            state.setAllowAiThinking(isChecked);

            await fetchAndStoreModelInputLimits(); // Re-fetch models with new thinking state
            renderSettingsModal(); // Re-render the modal with the new model list
        });
    }

    const modelSelector = document.getElementById('selected-ai-model') as HTMLSelectElement;
    if (modelSelector) {
        modelSelector.addEventListener('change', () => {
            state.setSelectedModel(modelSelector.value as AvailableTextModel);
        });
    }
}
