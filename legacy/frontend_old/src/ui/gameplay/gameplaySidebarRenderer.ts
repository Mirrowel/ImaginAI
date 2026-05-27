
// src/ui/gameplay/gameplaySidebarRenderer.ts
import * as state from '../../state';
import type { Adventure, AdventureEditorContext, GameplaySidebarTab } from '../../types';
import { navigateTo, renderApp } from '../../viewManager';
import { 
    handleAdventureDetailBlur, 
    handleEditAdventureCard, 
    handleSaveAdventureCardChanges, 
    handleCancelAdventureCardEdit, 
    handleDeleteAdventureCard, 
    handleAddCardToAdventureSnapshot, 
    handleToggleShowAddAdventureCardForm, 
    handleCancelAddAdventureCardForm,
    handleDuplicateAdventureCard
} from '../../eventHandlers/index';

import { renderGameplaySidebarPlotTab } from './gameplaySidebarPlotTabRenderer';
import { renderGameplaySidebarCardsTab } from './gameplaySidebarCardsTabRenderer';
import { renderGameplaySidebarInfoTab } from './gameplaySidebarInfoTabRenderer';
// Removed: import { renderGameplaySidebarStatsTab } from './gameplaySidebarStatsTabRenderer'; 

export function renderGameplaySidebar(
    adventure: Adventure, 
    isSidebarVisible: boolean, 
    currentTab: GameplaySidebarTab, 
    editingCardId: string | null,
    showAddCardForm: boolean
): string {
  if (!isSidebarVisible) {
    return `<aside class="gameplay-sidebar" id="gameplay-sidebar-content" aria-label="Adventure Details Sidebar"></aside>`;
  }

  const { scenarioSnapshot } = adventure;

  const sidebarHtml = `
    <aside class="gameplay-sidebar visible" id="gameplay-sidebar-content" aria-label="Adventure Details Sidebar">
      <button id="edit-adventure-settings-btn" class="secondary">Edit Full Adventure Settings</button>
      
      <div class="gameplay-sidebar-tabs" role="tablist" aria-label="Adventure Information Tabs">
          <button type="button" role="tab" class="gameplay-sidebar-tab-button ${currentTab === 'plot' ? 'active' : ''}" data-tab="plot" id="gside-tab-plot" aria-controls="gside-panel-plot" aria-selected="${currentTab === 'plot'}">Plot</button>
          <button type="button" role="tab" class="gameplay-sidebar-tab-button ${currentTab === 'cards' ? 'active' : ''}" data-tab="cards" id="gside-tab-cards" aria-controls="gside-panel-cards" aria-selected="${currentTab === 'cards'}">Cards</button>
          <button type="button" role="tab" class="gameplay-sidebar-tab-button ${currentTab === 'info' ? 'active' : ''}" data-tab="info" id="gside-tab-info" aria-controls="gside-panel-info" aria-selected="${currentTab === 'info'}">Info</button>
      </div>

      <div class="gameplay-sidebar-tab-content">
          ${currentTab === 'plot' ? renderGameplaySidebarPlotTab(scenarioSnapshot) : ''}
          ${currentTab === 'cards' ? renderGameplaySidebarCardsTab(scenarioSnapshot.cards, editingCardId, showAddCardForm) : ''}
          ${currentTab === 'info' ? renderGameplaySidebarInfoTab(adventure) : ''}
      </div>
    </aside>
  `;
  
  setTimeout(() => attachGameplaySidebarEventListeners(), 0);


  return sidebarHtml;
}


export function attachGameplaySidebarEventListeners() {
    const sidebar = document.getElementById('gameplay-sidebar-content');
    if (!sidebar || !state.activeAdventure) return;

    document.getElementById('edit-adventure-settings-btn')?.addEventListener('click', () => {
        if (state.activeAdventure) {
            state.setCurrentScenarioEditorTab('details'); 
            navigateTo('scenarioEditor', { 
                context: { 
                    type: 'adventure', 
                    data: state.activeAdventure 
                } as AdventureEditorContext 
            });
        }
    });

    sidebar.querySelectorAll('.gameplay-sidebar-tab-button').forEach(button => {
        button.addEventListener('click', (e) => {
            const tabId = (e.currentTarget as HTMLButtonElement).dataset.tab as GameplaySidebarTab; 
            if (tabId && state.currentGameplaySidebarTab !== tabId) {
                state.setCurrentGameplaySidebarTab(tabId);
                renderApp(); 
                 setTimeout(() => { 
                    document.getElementById(`gside-tab-${tabId}`)?.focus();
                },0);
            }
        });
    });

    if (state.currentGameplaySidebarTab === 'plot') {
        const instructionsDiv = sidebar.querySelector('#adventure-instructions') as HTMLDivElement;
        const plotEssentialsDiv = sidebar.querySelector('#adventure-plot-essentials') as HTMLDivElement;
        const authorsNotesDiv = sidebar.querySelector('#adventure-authors-notes') as HTMLDivElement;

        if (instructionsDiv) instructionsDiv.addEventListener('blur', () => handleAdventureDetailBlur('instructions', instructionsDiv));
        if (plotEssentialsDiv) plotEssentialsDiv.addEventListener('blur', () => handleAdventureDetailBlur('plotEssentials', plotEssentialsDiv));
        if (authorsNotesDiv) authorsNotesDiv.addEventListener('blur', () => handleAdventureDetailBlur('authorsNotes', authorsNotesDiv));
    }

    if (state.currentGameplaySidebarTab === 'cards') {
        sidebar.querySelectorAll('.edit-adventure-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const cardId = (e.currentTarget as HTMLElement).dataset.cardId;
                if (cardId) handleEditAdventureCard(cardId);
            });
        });
        sidebar.querySelectorAll('.duplicate-adventure-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const cardId = (e.currentTarget as HTMLElement).dataset.cardId;
                if (cardId) handleDuplicateAdventureCard(cardId);
            });
          });
        sidebar.querySelectorAll('.save-adventure-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const cardId = (e.currentTarget as HTMLElement).dataset.cardId;
                if (cardId) handleSaveAdventureCardChanges(cardId);
            });
        });
        sidebar.querySelectorAll('.cancel-adventure-card-edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                handleCancelAdventureCardEdit();
            });
        });
        sidebar.querySelectorAll('.delete-adventure-card-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); 
                const cardId = (e.currentTarget as HTMLElement).dataset.cardId;
                if (cardId) handleDeleteAdventureCard(cardId);
            });
        });

        document.getElementById('toggle-add-adventure-card-form-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            handleToggleShowAddAdventureCardForm();
        });
        document.getElementById('add-adventure-card-submit-btn')?.addEventListener('click', (e) => {
            e.stopPropagation(); 
            handleAddCardToAdventureSnapshot();
        });
        document.getElementById('cancel-add-adventure-card-btn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCancelAddAdventureCardForm();
        });
    }
}