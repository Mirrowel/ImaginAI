// src/viewManager.ts
import * as state from './state';
import { appElement, scenarioListView, scenarioEditorView, gameplayView, adventureListView } from './domElements';
import { renderScenarioList, renderAdventureList, renderSettingsModal, renderGameplay, renderScenarioEditor, renderConfirmationModal, renderTokenStatsModal } from './ui'; // Added renderTokenStatsModal
import type { View, NewScenarioScaffold, Adventure, EditorContext, ScenarioEditorContext } from './types';
import { loadAdventuresFromAPI } from './storage'; // Updated import to load from API

export function navigateTo(view: View, params?: any) {
  state.setCurrentView(view);

  if (!scenarioListView || !scenarioEditorView || !gameplayView || !adventureListView) {
      console.error("One or more view elements are missing from the DOM.");
      if (appElement) appElement.innerHTML = "<p>Critical error: UI elements missing. App cannot render.</p>";
      return;
  }

  scenarioListView.style.display = view === 'scenarioList' ? 'block' : 'none';
  scenarioEditorView.style.display = view === 'scenarioEditor' ? 'block' : 'none';
  gameplayView.style.display = view === 'gameplay' ? 'block' : 'none';
  adventureListView.style.display = view === 'adventureList' ? 'block' : 'none';


  if (view === 'scenarioEditor') {
    const editorContextParam = params?.context as EditorContext | undefined; 
    if (editorContextParam) {
        if (editorContextParam.type === 'scenario' || editorContextParam.type === 'adventure') {
            state.setCurrentEditorContext(editorContextParam);
        } else {
            console.error("Attempted to navigate to scenarioEditor with invalid context type:", editorContextParam);
            state.setCurrentEditorContext({
                type: 'scenario',
                data: {
                    name: '', instructions: '', plotEssentials: '', authorsNotes: '', openingScene: '', cards: [],
                    playerDescription: '', tags: '', visibility: 'private'
                } as NewScenarioScaffold 
            } as ScenarioEditorContext);
        }
    } else {
        console.error("Attempted to navigate to scenarioEditor without valid context.");
        state.setCurrentEditorContext({
            type: 'scenario',
            data: {
                 name: '', instructions: '', plotEssentials: '', authorsNotes: '', openingScene: '', cards: [],
                 playerDescription: '', tags: '', visibility: 'private'
            } as NewScenarioScaffold 
        } as ScenarioEditorContext);
    }
  } else if (view === 'gameplay') {
    const adventureToPlay = params?.adventure as Adventure | undefined;
    if (adventureToPlay) {
        state.setActiveAdventure(adventureToPlay);

        if (!adventureToPlay.adventureHistory || adventureToPlay.adventureHistory.length === 0) {
            // The backend should now provide the opening scene as the first turn.
            // If not, we can handle it here, but ideally the backend sends it.
            console.log("Adventure history is empty. Expecting backend to have created the first turn.");
        }
        state.setIsPlayerActionInputVisible(false);
        state.setCurrentPlayerActionType('do'); 
    } else {
        console.error("Attempted to navigate to gameplay without a valid adventure.");
        state.setActiveAdventure(null); 
        navigateTo('adventureList'); 
        return; 
    }
  } else if (view === 'adventureList') {
    loadAdventuresFromAPI(); // Load adventures from API
  }
  
  if (view !== 'scenarioEditor') {
    state.setCurrentEditorContext(null);
  }
  
  renderApp();
}

export function renderApp() {
  if (!appElement) {
      console.error("App element not found in DOM. Cannot render.");
      document.body.innerHTML = "<p>Critical error: App element not found. App cannot start.</p>";
      return;
  }

  renderSettingsModal();
  renderConfirmationModal();
  renderTokenStatsModal(); // Render token stats modal

  // API Key check is removed from the frontend.

  const mainContentArea = appElement.querySelector('main') || appElement;
  if (scenarioListView && !scenarioListView.parentElement) mainContentArea.appendChild(scenarioListView);
  if (adventureListView && !adventureListView.parentElement) mainContentArea.appendChild(adventureListView);
  if (scenarioEditorView && !scenarioEditorView.parentElement) mainContentArea.appendChild(scenarioEditorView);
  if (gameplayView && !gameplayView.parentElement) mainContentArea.appendChild(gameplayView);


  switch (state.currentView) {
    case 'scenarioList':
      renderScenarioList();
      break;
    case 'adventureList':
      renderAdventureList();
      break;
    case 'scenarioEditor':
      renderScenarioEditor();
      break;
    case 'gameplay':
      renderGameplay();
      break;
  }
   setTimeout(() => {
    let headingIdToFocus = '';
    // Prioritize modals for focus
    if (state.isTokenStatsModalVisible) {
        headingIdToFocus = 'token-stats-modal-heading';
    } else if (state.globalSettingsVisible) {
        headingIdToFocus = 'settings-modal-heading'; 
    } else if (state.isConfirmationModalVisible) {
        headingIdToFocus = 'confirmation-modal-heading';
    } else { // No modal, focus main view
        switch (state.currentView) {
            case 'scenarioList': headingIdToFocus = 'scenario-list-heading'; break;
            case 'adventureList': headingIdToFocus = 'adventure-list-heading'; break;
            case 'scenarioEditor': headingIdToFocus = 'scenario-editor-heading'; break;
            case 'gameplay': headingIdToFocus = 'gameplay-heading'; break;
        }
    }
    
    if (headingIdToFocus) {
        const headingElement = document.getElementById(headingIdToFocus) as HTMLElement | null;
        if (headingElement && headingElement.offsetParent !== null) { 
            headingElement?.focus();
        }
    }
   }, 0);
}
