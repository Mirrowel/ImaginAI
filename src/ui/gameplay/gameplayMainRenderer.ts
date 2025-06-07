
// src/ui/gameplay/gameplayMainRenderer.ts
import { gameplayView } from '../../domElements';
import * as state from '../../state';
import type { ActionType } from '../../types';
import { navigateTo, renderApp } from '../../viewManager';
import {
    handlePlayerActionSubmit,
    handleEditTurn,
    handleDeleteTurn,
    handleContinueAI,
    handleRetryAI,
    handleSaveInlineEdit,
    handleCancelInlineEdit,
    handlePlayerActionTypeButtonClick,
    handlePlayerInputAction,
    handleInspectTurn, // New handler
} from '../../eventHandlers/index'; 
import { renderGameplayHeader } from './gameplayHeaderRenderer';
import { renderGameplayHistoryLog } from './gameplayHistoryRenderer';
import { renderGameplayActionArea } from './gameplayActionAreaRenderer';
import { renderGameplaySidebar } from './gameplaySidebarRenderer';

export function renderGameplay() {
  if (!gameplayView) return;
  if (!state.activeAdventure) {
    gameplayView.innerHTML = `<p>No active adventure. Please select one from your adventures list or start a new one.</p><button id="back-to-adventures-gameplay">Back to Adventures</button>`;
    document.getElementById('back-to-adventures-gameplay')?.addEventListener('click', () => navigateTo('adventureList'));
    return;
  }

  const { adventureName, adventureHistory } = state.activeAdventure;

  gameplayView.innerHTML = `
    ${renderGameplayHeader(adventureName, state.isGameplaySidebarVisible)}
    <div class="gameplay-layout">
      <section class="gameplay-main-content" aria-label="Main story content">
        ${renderGameplayHistoryLog(adventureHistory, state.editingTurnId)}
        ${!state.isLoadingAI ? renderGameplayActionArea(state.currentPlayerActionType, state.isPlayerActionInputVisible, state.isLoadingAI) : ''}
        ${state.isLoadingAI ? '<p class="loading-indicator" role="status">Storyteller is thinking...</p>' : ''}
      </section>
      ${renderGameplaySidebar(state.activeAdventure, state.isGameplaySidebarVisible, state.currentGameplaySidebarTab, state.editingAdventureDetailsCardId, state.showAddAdventureCardForm)}
    </div>
  `;

  const historyLogElement = document.getElementById('history-log');
  if (historyLogElement && !state.editingTurnId) {
      const mainContentArea = gameplayView.querySelector('.gameplay-main-content');
      if (mainContentArea) {
          mainContentArea.scrollTop = mainContentArea.scrollHeight;
      }
  }

  // --- Attach Event Listeners ---
  document.getElementById('exit-game-btn')?.addEventListener('click', () => {
    if (state.activeAdventure) { 
        state.activeAdventure.lastPlayedAt = Date.now();
        // No longer need to save to storage here, backend handles it.
    }
    state.setActiveAdventure(null);
    state.setEditingTurnId(null); 
    state.setEditingAdventureDetailsCardId(null);
    state.setShowAddAdventureCardForm(false); 
    state.setIsPlayerActionInputVisible(false);
    state.setIsGameplaySidebarVisible(true); 
    state.setCurrentGameplaySidebarTab('plot'); 
    navigateTo('adventureList');
  });

  document.getElementById('sidebar-toggle-btn')?.addEventListener('click', () => {
    state.setIsGameplaySidebarVisible(!state.isGameplaySidebarVisible);
    renderApp(); 
  });

  ['do', 'say', 'story'].forEach(type => {
    document.getElementById(`action-type-${type}`)?.addEventListener('click', () => handlePlayerActionTypeButtonClick(type as ActionType));
  });

  const playerActionTextarea = document.getElementById('player-action') as HTMLTextAreaElement;
  if (playerActionTextarea) {
    playerActionTextarea.addEventListener('keydown', handlePlayerInputAction);
    const playerActionForm = document.getElementById('player-action-form');
    playerActionForm?.addEventListener('submit', handlePlayerActionSubmit);
  }
  
  document.getElementById('retry-ai-btn')?.addEventListener('click', () => {
    if (!state.isLoadingAI) handleRetryAI();
  });
  document.getElementById('continue-ai-btn')?.addEventListener('click', () => {
    if (!state.isLoadingAI) handleContinueAI();
  });

  gameplayView.querySelectorAll('.edit-turn-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const turnId = (e.currentTarget as HTMLElement).dataset.turnId;
        if (turnId) handleEditTurn(turnId);
    });
  });
  gameplayView.querySelectorAll('.delete-turn-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const turnId = (e.currentTarget as HTMLElement).dataset.turnId;
        if (turnId) handleDeleteTurn(turnId);
    });
  });
  gameplayView.querySelectorAll('.inspect-turn-btn').forEach(btn => { // New listener
    btn.addEventListener('click', (e) => {
        const turnId = (e.currentTarget as HTMLElement).dataset.inspectTurnId;
        if (turnId) handleInspectTurn(turnId);
    });
  });
  gameplayView.querySelectorAll('.save-inline-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const turnId = (e.currentTarget as HTMLElement).dataset.turnId;
        if (turnId) handleSaveInlineEdit(turnId);
    });
  });
  gameplayView.querySelectorAll('.cancel-inline-edit-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        handleCancelInlineEdit();
    });
  });


  // Focus Management
  if (state.isTokenStatsModalVisible) { // Prioritize token stats modal focus
    const closeButton = document.getElementById('token-stats-modal-close-btn');
    closeButton?.focus();
  } else if (state.isGameplaySidebarVisible) {
      if (state.editingAdventureDetailsCardId && state.currentGameplaySidebarTab === 'cards') {
          const firstInput = document.getElementById(`edit-card-type-${state.editingAdventureDetailsCardId}`) as HTMLInputElement;
          firstInput?.focus();
      } else if (state.showAddAdventureCardForm && state.currentGameplaySidebarTab === 'cards') {
          const addCardTypeInput = document.getElementById('add-adventure-card-type') as HTMLInputElement;
          addCardTypeInput?.focus();
      } else if (!state.editingAdventureDetailsCardId && !state.showAddAdventureCardForm) {
         const activeTabPanel = document.getElementById(`gside-panel-${state.currentGameplaySidebarTab}`);
         activeTabPanel?.focus(); 
      }
  }
  
  if (state.editingTurnId) {
    const activeTextarea = document.getElementById(`inline-edit-textarea-${state.editingTurnId}`) as HTMLTextAreaElement;
    activeTextarea?.focus();
    activeTextarea?.select();
  } else if (state.isPlayerActionInputVisible && !state.isLoadingAI && !state.globalSettingsVisible && !state.editingAdventureDetailsCardId && !state.showAddAdventureCardForm && !state.isTokenStatsModalVisible) { 
    playerActionTextarea?.focus();
  } else if (!state.isPlayerActionInputVisible && !state.isLoadingAI && !state.globalSettingsVisible && !state.editingTurnId && !state.editingAdventureDetailsCardId && !state.showAddAdventureCardForm && !state.isGameplaySidebarVisible && !state.isTokenStatsModalVisible) {
    const firstActionButton = document.querySelector('.gameplay-action-area .action-button:not([disabled])') as HTMLButtonElement;
    firstActionButton?.focus();
  } else if (!state.isLoadingAI && !state.globalSettingsVisible && !state.editingTurnId && !state.editingAdventureDetailsCardId && !state.showAddAdventureCardForm && !state.isGameplaySidebarVisible && !state.isTokenStatsModalVisible) {
     const gameplayHeading = document.getElementById('gameplay-heading');
     gameplayHeading?.focus();
  }
}
