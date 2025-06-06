
// src/ui/adventureListRenderer.ts
import { adventureListView } from '../domElements';
import * as state from '../state';
import { escapeHTML } from '../utils'; 
import { navigateTo } from '../viewManager';
import { handleDeleteAdventure, handleDuplicateAdventure } from '../eventHandlers/index'; 
import type { AdventureEditorContext } from '../types';

export function renderAdventureList() {
  if (!adventureListView) return;

  const sortedAdventures = [...state.adventures].sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);

  adventureListView.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
      <h2 id="adventure-list-heading" tabindex="-1">My Adventures</h2>
      <button id="back-to-scenario-templates-btn" class="secondary">Back to Scenario Templates</button>
    </div>
    <div id="adventures-container" style="margin-top: 1rem;">
      ${sortedAdventures.length === 0 ? '<p>You have no active adventures. Start one from a scenario template!</p>' :
        sortedAdventures.map(adventure => `
          <div class="adventure-item" data-id="${adventure.id}" tabindex="0" aria-labelledby="adventure-title-${adventure.id}">
            <h3 id="adventure-title-${adventure.id}">${escapeHTML(adventure.adventureName)}</h3>
            <p><em>Based on: ${escapeHTML(adventure.sourceScenarioName)}</em></p>
            <p><small>Last played: ${new Date(adventure.lastPlayedAt).toLocaleString()}</small></p>
            <div class="adventure-item-actions">
              <button class="continue-adventure-btn" data-id="${adventure.id}" aria-label="Continue adventure ${escapeHTML(adventure.adventureName)}">Continue</button>
              <button class="edit-adventure-btn secondary" data-id="${adventure.id}" aria-label="Edit adventure settings for ${escapeHTML(adventure.adventureName)}">Edit Settings</button>
              <button class="duplicate-adventure-btn secondary" data-id="${adventure.id}" aria-label="Duplicate adventure ${escapeHTML(adventure.adventureName)}">Duplicate</button>
              <button class="delete-adventure-btn danger" data-id="${adventure.id}" aria-label="Delete adventure ${escapeHTML(adventure.adventureName)}">Delete</button>
            </div>
          </div>
        `).join('')
      }
    </div>
  `;

  document.getElementById('back-to-scenario-templates-btn')?.addEventListener('click', () => {
    navigateTo('scenarioList');
  });

  adventureListView.querySelectorAll('.adventure-item').forEach(item => {
    item.addEventListener('keydown', (e: Event) => {
        const keyboardEvent = e as KeyboardEvent;
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
            const continueButton = item.querySelector('.continue-adventure-btn') as HTMLButtonElement;
            if (continueButton) continueButton.click();
        }
    });
  });

  adventureListView.querySelectorAll('.continue-adventure-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const adventureId = (e.currentTarget as HTMLElement).getAttribute('data-id'); 
      const adventure = state.adventures.find(a => a.id === adventureId);
      if (adventure) {
        navigateTo('gameplay', { adventure });
      }
    });
  });

  adventureListView.querySelectorAll('.edit-adventure-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const adventureId = (e.currentTarget as HTMLElement).getAttribute('data-id');
        const adventure = state.adventures.find(a => a.id === adventureId);
        if (adventure) {
            navigateTo('scenarioEditor', { 
                context: { 
                    type: 'adventure', 
                    data: adventure 
                } as AdventureEditorContext 
            });
        }
    });
  });

  adventureListView.querySelectorAll('.duplicate-adventure-btn').forEach(btn => { 
    btn.addEventListener('click', (e) => {
      const adventureId = (e.currentTarget as HTMLElement).getAttribute('data-id');
      if (adventureId) {
        handleDuplicateAdventure(adventureId);
      }
    });
  });

  adventureListView.querySelectorAll('.delete-adventure-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const adventureId = (e.currentTarget as HTMLElement).getAttribute('data-id'); 
      if (adventureId) { // Confirmation is now handled within handleDeleteAdventure
        handleDeleteAdventure(adventureId);
      }
    });
  });
}
