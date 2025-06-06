
// index.tsx (Main Entry Point)
import { API_KEY, ai } from './src/config';
import { loadScenariosFromStorage, loadAdventuresFromStorage, loadGlobalSettingsFromStorage } from './src/storage';
import { navigateTo, renderApp } from './src/viewManager';
import { appElement } from './src/domElements'; 
import * as state from './src/state'; // Import state for settings button
import { handleImportScenarioFileSelected } from './src/eventHandlers/index'; // Import scenario import handler
import { fetchAndStoreModelInputLimits } from './src/modelInfoService'; // Import new service

// Initialize application
async function initializeApp() {
    if (API_KEY && ai) {
        await fetchAndStoreModelInputLimits(); // Fetch model limits early
        loadGlobalSettingsFromStorage(); // Load global settings first
        loadScenariosFromStorage();
        loadAdventuresFromStorage(); 
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

    } else {
        if (appElement) {
             renderApp(); // This will render the API key error message
        } else {
            console.error("CRITICAL: App element not found. Cannot render API key error.");
            const body = document.body;
            if (body) {
                body.innerHTML = `<div style="padding: 20px; text-align: center; background-color: #ffdddd; color: #a00; border: 1px solid #a00; border-radius: 5px;">
                    <h2 id="error-heading">Critical Application Error</h2>
                    <p>The application's main container was not found. Please check the HTML structure or console for more details.</p>
                </div>`;
            } else {
                alert("Critical application error. API key might be missing or the app structure is broken. Check console.");
            }
        }
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
