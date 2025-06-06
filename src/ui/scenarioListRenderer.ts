
// src/ui/scenarioListRenderer.ts
import { scenarioListView } from '../domElements';
import * as Rstate from '../state'; // Aliased to Rstate to avoid conflict
import { escapeHTML, generateId } from '../utils'; 
import { navigateTo, renderApp } from '../viewManager';
import { handleDeleteScenario, handleStartNewAdventure, handleDuplicateScenario, handleExportScenario, handleImportScenarioTrigger } from '../eventHandlers/index';
import type { NewScenarioScaffold, ScenarioEditorContext, Scenario } from '../types';
// REMOVED: import { loadDefaultScenarioTemplate } from '../storage';

export function renderScenarioList() {
  if (!scenarioListView) return;
  scenarioListView.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 id="scenario-list-heading" tabindex="-1">Scenario Templates</h2>
        <div>
            <button id="import-scenario-btn" class="secondary" aria-label="Import a scenario template from a JSON file">Import Scenario</button>
            <button id="view-adventures-btn" class="secondary" aria-label="View your adventures" style="margin-left: 0.5rem;">View My Adventures</button>
            <button id="create-new-scenario-btn" aria-label="Create a new scenario template" style="margin-left: 0.5rem;">Create New Template</button>
        </div>
    </div>
    <div id="scenarios-container" style="margin-top: 1rem;">
      ${Rstate.scenarios.length === 0 ? '<p>You have no saved scenario templates yet. Create one or import a scenario to begin!</p>' :
        Rstate.scenarios.map(scenario => `
          <div class="scenario-item" data-id="${scenario.id}" tabindex="0" aria-labelledby="scenario-title-${scenario.id}">
            <h3 id="scenario-title-${scenario.id}">${escapeHTML(scenario.name)}</h3>
            <p><em>${escapeHTML(scenario.instructions.substring(0, 150))}...</em></p>
            <div class="scenario-item-actions">
              <button class="start-adventure-btn" data-id="${scenario.id}" aria-label="Start new adventure from ${escapeHTML(scenario.name)}">Start New Adventure</button>
              <button class="edit-scenario-btn" data-id="${scenario.id}" aria-label="Edit template ${escapeHTML(scenario.name)}">Edit Template</button>
              <button class="export-scenario-btn secondary" data-id="${scenario.id}" aria-label="Export template ${escapeHTML(scenario.name)}">Export</button>
              <button class="duplicate-scenario-btn secondary" data-id="${scenario.id}" aria-label="Duplicate template ${escapeHTML(scenario.name)}">Duplicate</button>
              <button class="delete-scenario-btn danger" data-id="${scenario.id}" aria-label="Delete template ${escapeHTML(scenario.name)}">Delete Template</button>
            </div>
          </div>
        `).join('')
      }
    </div>
    <input type="file" id="import-scenario-file-input" accept=".json" style="display:none;">
  `;

  // REMOVED: "Edit Default Scenario Template" button and its event listener.

  document.getElementById('import-scenario-btn')?.addEventListener('click', handleImportScenarioTrigger);
  // The actual file selection is handled by an event listener on 'import-scenario-file-input' in scenarioEventHandlers.ts (attached in main index.tsx or viewManager if needed globally)
  // For now, the trigger is here, the handler will be attached once when app loads.

  document.getElementById('create-new-scenario-btn')?.addEventListener('click', () => {
    // Rstate.setIsEditingDefaultScenarioTemplate(false); // No longer needed
    navigateTo('scenarioEditor', { 
        context: { 
            type: 'scenario', 
            data: { 
                cards: [], 
                name: '', 
                instructions: '', 
                plotEssentials: '', 
                authorsNotes: '', 
                openingScene: '',
                playerDescription: '', 
                tags: '', 
                visibility: 'private' 
            } as NewScenarioScaffold
        } as ScenarioEditorContext 
    });
  });

  document.getElementById('view-adventures-btn')?.addEventListener('click', () => {
    navigateTo('adventureList');
  });

  scenarioListView.querySelectorAll('.scenario-item').forEach(item => {
    item.addEventListener('keydown', (e: Event) => {
        const keyboardEvent = e as KeyboardEvent;
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            const startButton = item.querySelector('.start-adventure-btn') as HTMLButtonElement;
            if (startButton) startButton.click();
        }
    });
  });

  scenarioListView.querySelectorAll('.start-adventure-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scenarioId = (e.target as HTMLElement).getAttribute('data-id');
      if (scenarioId) {
        handleStartNewAdventure(scenarioId);
      }
    });
  });

  scenarioListView.querySelectorAll('.edit-scenario-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      // Rstate.setIsEditingDefaultScenarioTemplate(false); // No longer needed
      const scenarioId = (e.target as HTMLElement).getAttribute('data-id');
      const scenario = Rstate.scenarios.find(s => s.id === scenarioId);
      if (scenario) {
        navigateTo('scenarioEditor', { 
            context: { 
                type: 'scenario', 
                data: {...scenario} 
            } as ScenarioEditorContext 
        });
      }
    });
  });

  scenarioListView.querySelectorAll('.export-scenario-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scenarioId = (e.target as HTMLElement).getAttribute('data-id');
      if (scenarioId) {
        handleExportScenario(scenarioId);
      }
    });
  });

  scenarioListView.querySelectorAll('.duplicate-scenario-btn').forEach(btn => { 
    btn.addEventListener('click', (e) => {
      const scenarioId = (e.target as HTMLElement).getAttribute('data-id');
      if (scenarioId) {
        handleDuplicateScenario(scenarioId);
      }
    });
  });

  scenarioListView.querySelectorAll('.delete-scenario-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const scenarioId = (e.target as HTMLElement).getAttribute('data-id');
      if (scenarioId) { 
        handleDeleteScenario(scenarioId);
      }
    });
  });
}
