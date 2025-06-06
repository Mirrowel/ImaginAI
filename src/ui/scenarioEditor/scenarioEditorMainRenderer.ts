
// src/ui/scenarioEditor/scenarioEditorMainRenderer.ts
import { scenarioEditorView } from '../../domElements';
import * as Rstate from '../../state';
import { escapeHTML } from '../../utils';
import type { Scenario, Adventure, NewScenarioScaffold, ScenarioSnapshot } from '../../types';
import { navigateTo, renderApp } from '../../viewManager';
import { 
    handleSaveUnifiedEditorData, 
    handleAddCardToEditor, 
    handleDeleteCardFromEditor,
    handleEditScenarioCard, 
    handleSaveScenarioCardChanges, 
    handleCancelScenarioCardEdit, 
    handleToggleShowAddScenarioCardForm, 
    handleCancelAddScenarioCardForm,
    handleImportCardsTrigger, 
    handleExportCards, 
    handleImportCardsFileSelected,
    handleImportAIDCardsTrigger, 
    handleExportAIDCards,
    handleImportAIDCardsFileSelected, 
    handleDuplicateCardInEditor
} from '../../eventHandlers/index';

import { renderScenarioEditorPlotTab } from './scenarioEditorPlotTabRenderer';
import { renderScenarioEditorCardsTab } from './scenarioEditorCardsTabRenderer';
import { renderScenarioEditorDetailsTab } from './scenarioEditorDetailsTabRenderer';

export function renderScenarioEditor() {
  if (!scenarioEditorView) return;
  
  const editorContext = Rstate.currentEditorContext; 

  if (!editorContext) {
    scenarioEditorView.innerHTML = `<p>Error: No data to edit. Please return to the previous screen.</p><button id="editor-back-btn">Back</button>`;
    document.getElementById('editor-back-btn')?.addEventListener('click', () => {
        // Rstate.setIsEditingDefaultScenarioTemplate(false); // No longer needed
        if (Rstate.activeAdventure && Rstate.currentView === 'gameplay') { 
            navigateTo('gameplay'); 
        } else {
            navigateTo('scenarioList');
        }
    });
    return;
  }
  
  let scenarioDataSource: Scenario | NewScenarioScaffold | ScenarioSnapshot;
  let adventureDataForEditor: Adventure | null = null;
  let isExistingItem: boolean;
  let editorTitle: string;
  let saveButtonText: string;

  // REMOVED: isEditingDefaultScenarioTemplate logic
  if (editorContext.type === 'scenario') {
    scenarioDataSource = editorContext.data; 
    isExistingItem = 'id' in editorContext.data && !!editorContext.data.id; 
    editorTitle = isExistingItem ? 'Edit Scenario Template' : 'Create New Scenario Template';
    saveButtonText = isExistingItem ? 'Save Changes' : 'Create Scenario';
  } else { // adventure type
    scenarioDataSource = editorContext.data.scenarioSnapshot; 
    adventureDataForEditor = editorContext.data; 
    isExistingItem = true; 
    editorTitle = 'Edit Adventure Settings';
    saveButtonText = 'Save Adventure Settings';
  }
  
  scenarioEditorView.innerHTML = `
    <h2 id="scenario-editor-heading" tabindex="-1">${editorTitle}</h2>
    <form id="unified-editor-form" aria-labelledby="scenario-editor-heading">
      
      <div class="editor-tabs">
        <button type="button" class="tab-button ${Rstate.currentScenarioEditorTab === 'plot' ? 'active' : ''}" data-tab="plot" aria-controls="plot-tab-content" aria-selected="${Rstate.currentScenarioEditorTab === 'plot'}">Plot</button>
        <button type="button" class="tab-button ${Rstate.currentScenarioEditorTab === 'cards' ? 'active' : ''}" data-tab="cards" aria-controls="cards-tab-content" aria-selected="${Rstate.currentScenarioEditorTab === 'cards'}">Cards</button>
        <button type="button" class="tab-button ${Rstate.currentScenarioEditorTab === 'details' ? 'active' : ''}" data-tab="details" aria-controls="details-tab-content" aria-selected="${Rstate.currentScenarioEditorTab === 'details'}">Details</button>
      </div>

      <div class="tab-content">
        ${Rstate.currentScenarioEditorTab === 'plot' ? renderScenarioEditorPlotTab(scenarioDataSource, editorContext.type) : ''}
        ${Rstate.currentScenarioEditorTab === 'cards' ? renderScenarioEditorCardsTab(scenarioDataSource, Rstate.showAddScenarioCardForm, Rstate.currentCardTypeForEditor, Rstate.editingScenarioEditorCardId, Rstate.scenarioEditorCardSearchTerm, Rstate.scenarioEditorCardFilterType, Rstate.scenarioEditorCardDisplayType) : ''}
        ${Rstate.currentScenarioEditorTab === 'details' ? renderScenarioEditorDetailsTab(scenarioDataSource, editorContext.type, adventureDataForEditor) : ''}
      </div>

      <div style="margin-top: 2rem;">
        <button type="submit">${saveButtonText}</button>
        <button type="button" id="cancel-edit-btn" class="secondary">Cancel</button>
      </div>
    </form>
  `;

  // --- Attach Event Listeners ---

  // Tab Buttons
  scenarioEditorView.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', (e) => {
      const tabId = (e.currentTarget as HTMLButtonElement).dataset.tab as 'plot' | 'cards' | 'details';
      if (tabId && Rstate.currentScenarioEditorTab !== tabId) {
        Rstate.setCurrentScenarioEditorTab(tabId);
        renderScenarioEditor(); // Re-render to show new tab and attach its listeners
        setTimeout(() => {
            const activeTabButton = scenarioEditorView.querySelector(`.tab-button[data-tab="${tabId}"]`) as HTMLElement;
            activeTabButton?.focus();
        }, 0);
      }
    });
  });

  // Form Submit and Cancel
  document.getElementById('unified-editor-form')?.addEventListener('submit', handleSaveUnifiedEditorData);
  
  document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
    // const wasEditingDefault = Rstate.isEditingDefaultScenarioTemplate; // No longer needed
    // Rstate.setIsEditingDefaultScenarioTemplate(false); // No longer needed
    Rstate.setCurrentScenarioEditorTab('plot'); 
    Rstate.setScenarioEditorCardSearchTerm("");
    Rstate.setScenarioEditorCardFilterType("");
    Rstate.setScenarioEditorCardDisplayType("grid");
    Rstate.setEditingScenarioEditorCardId(null);
    Rstate.setShowAddScenarioCardForm(false);

    // if (wasEditingDefault) { // No longer needed
    //     navigateTo('scenarioList');
    // } else 
    if (editorContext.type === 'adventure' && Rstate.activeAdventure && Rstate.activeAdventure.id === editorContext.data.id) { 
        navigateTo('gameplay', { adventure: Rstate.activeAdventure }); 
    } else if (editorContext.type === 'adventure') {
        navigateTo('adventureList'); 
    }
    else {
        navigateTo('scenarioList'); 
    }
  });
  
  // Attach listeners specific to the "Cards" tab if it's active
  if (Rstate.currentScenarioEditorTab === 'cards') {
    // Card Import/Export listeners (Standard format)
    document.getElementById('import-cards-btn')?.addEventListener('click', handleImportCardsTrigger);
    document.getElementById('export-cards-btn')?.addEventListener('click', handleExportCards);
    document.getElementById('import-cards-file-input')?.addEventListener('change', handleImportCardsFileSelected);

    // Card Import/Export listeners (AI Dungeon format)
    document.getElementById('import-aid-cards-btn')?.addEventListener('click', handleImportAIDCardsTrigger);
    document.getElementById('export-aid-cards-btn')?.addEventListener('click', handleExportAIDCards);
    document.getElementById('import-aid-cards-file-input')?.addEventListener('change', handleImportAIDCardsFileSelected); 

    // Add/Edit Card Form related
    document.getElementById('toggle-add-scenario-card-form-btn')?.addEventListener('click', handleToggleShowAddScenarioCardForm);
    document.getElementById('add-card-btn')?.addEventListener('click', handleAddCardToEditor);
    document.getElementById('cancel-add-scenario-card-btn')?.addEventListener('click', handleCancelAddScenarioCardForm);

    const cardTypeInput = document.getElementById('card-type') as HTMLInputElement;
    if (cardTypeInput) {
         cardTypeInput.addEventListener('input', () => {
             Rstate.setCurrentCardTypeForEditor(cardTypeInput.value);
         });
    }

    // Card Item Actions (Edit, Delete, Duplicate in display mode)
    scenarioEditorView.querySelectorAll('.edit-scenario-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardId = (e.currentTarget as HTMLElement).dataset.cardId;
            if (cardId) handleEditScenarioCard(cardId);
        });
    });
    scenarioEditorView.querySelectorAll('.duplicate-card-editor-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardId = (e.currentTarget as HTMLElement).dataset.cardId;
            if (cardId) handleDuplicateCardInEditor(cardId);
        });
    });
    scenarioEditorView.querySelectorAll('.delete-card-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardId = (e.currentTarget as HTMLElement).getAttribute('data-card-id'); 
            if (cardId) handleDeleteCardFromEditor(cardId);
        });
    });

    // Save/Cancel for inline card editing form
    scenarioEditorView.querySelectorAll('.save-scenario-card-changes-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const cardId = (e.currentTarget as HTMLElement).dataset.cardId;
            if (cardId) handleSaveScenarioCardChanges(cardId);
        });
    });
    scenarioEditorView.querySelectorAll('.cancel-scenario-card-edit-btn').forEach(btn => {
        btn.addEventListener('click', handleCancelScenarioCardEdit);
    });
    
    // Filter/Search/Display controls
    const searchInput = document.getElementById('card-search-input') as HTMLInputElement;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            Rstate.setScenarioEditorCardSearchTerm(searchInput.value);
            renderScenarioEditor(); // Re-render to apply filter
            document.getElementById('card-search-input')?.focus(); // Re-focus after re-render
        });
    }
    const typeFilterSelect = document.getElementById('card-type-filter') as HTMLSelectElement;
    if (typeFilterSelect) {
        typeFilterSelect.addEventListener('change', () => {
            Rstate.setScenarioEditorCardFilterType(typeFilterSelect.value);
            renderScenarioEditor(); // Re-render to apply filter
            document.getElementById('card-type-filter')?.focus(); // Re-focus
        });
    }
    scenarioEditorView.querySelectorAll('.display-style-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const displayType = (e.currentTarget as HTMLButtonElement).dataset.display as 'grid' | 'list' | 'compact';
            if (displayType) {
                Rstate.setScenarioEditorCardDisplayType(displayType);
                renderScenarioEditor(); // Re-render to apply display change
                 // Re-focus the active button
                setTimeout(() => (scenarioEditorView.querySelector(`.display-style-btn[data-display="${displayType}"]`) as HTMLElement)?.focus(), 0);
            }
        });
    });
  }

   // Focus management for editor
   if (Rstate.currentScenarioEditorTab === 'cards') {
       if (Rstate.editingScenarioEditorCardId) {
            const firstInput = document.getElementById(`edit-scenario-card-type-${Rstate.editingScenarioEditorCardId}`) as HTMLInputElement;
            firstInput?.focus();
       } else if (Rstate.showAddScenarioCardForm) {
            const addCardTypeInput = document.getElementById('card-type') as HTMLInputElement;
            addCardTypeInput?.focus();
       } else {
           const cardSearchInput = document.getElementById('card-search-input') as HTMLInputElement;
           if (cardSearchInput && cardSearchInput.offsetParent !== null) cardSearchInput.focus(); 
           else document.getElementById('scenario-editor-heading')?.focus(); 
       }
   } else {
        const firstFocusableElementInTab = scenarioEditorView.querySelector(`#${Rstate.currentScenarioEditorTab}-tab-content input, #${Rstate.currentScenarioEditorTab}-tab-content textarea, #${Rstate.currentScenarioEditorTab}-tab-content select`) as HTMLElement;
        if (firstFocusableElementInTab && firstFocusableElementInTab.offsetParent !== null) { 
            firstFocusableElementInTab.focus();
        } else {
            document.getElementById('scenario-editor-heading')?.focus(); 
        }
   }
}
