// index.tsx (Main Entry Point)
import { loadScenariosFromAPI, loadAdventuresFromAPI } from './src/storage';
import { fetchGlobalSettingsFromAPI } from './src/settingsService';
import { navigateTo, renderApp } from './src/viewManager';
import { appElement } from './src/domElements';
import * as state from './src/state';
import { handleImportScenarioFileSelected } from './src/eventHandlers/index';
import { fetchAndStoreModelInputLimits } from './src/modelInfoService';

// Initialize application
async function initializeApp() {
    // API key check is removed. The app initializes regardless.
    await fetchGlobalSettingsFromAPI(); // Load global settings from API
    await fetchAndStoreModelInputLimits(); // Fetch model limits early
    await loadScenariosFromAPI(); // Load scenarios from API
    await loadAdventuresFromAPI(); // Load adventures from API
    navigateTo('scenarioList');

    // Add event listener for global settings button
    const settingsButton = document.getElementById('settings-button');
    if (settingsButton) {
        settingsButton.addEventListener('click', () => {
            state.setGlobalSettingsVisible(!state.globalSettingsVisible);
            renderApp(); // Re-render to show/hide modal
        });
    }

    // Add event listener for the scenario import file input
    const importScenarioFileInput = document.getElementById('import-scenario-file-input');
    if (importScenarioFileInput) {
        importScenarioFileInput.addEventListener('change', handleImportScenarioFileSelected);
    }
}

initializeApp().catch(error => {
    console.error("Failed to initialize application:", error);
    if (appElement) {
        appElement.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffdddd; color: #a00; border: 1px solid #a00; border-radius: 5px;">
            <h2 id="error-heading">Application Initialization Failed</h2>
            <p>An unexpected error occurred during startup. Please check the console for details.</p>
        </div>`;
    }
});
