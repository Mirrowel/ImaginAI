
// src/eventHandlers/gameplayEventHandlers.ts
import * as Rstate from '../state';
import { generateId } from '../utils';
import { saveAdventuresToStorage } from '../storage';
import { renderApp } from '../viewManager'; 
import { getAIGeneration } from '../geminiService';
import type { AdventureTurn, ActionType, TokenUsageStats, AvailableTextModel } from '../types';
import { renderGameplay } from '../ui/gameplay'; 
import { showConfirmationModal } from './modalEventHandlers'; 
import { fetchSpecificModelInputLimit } from '../modelInfoService'; // Import new service

async function generateAndProcessAIResponse(overrideCurrentUserMessage?: string) {
    if (!Rstate.activeAdventure) return;
    const formStatus = document.getElementById('player-action-form-status');
    
    try {
        const { response: aiResponse, stats: tokenStats } = await getAIGeneration(
            Rstate.activeAdventure.adventureHistory, 
            Rstate.activeAdventure.scenarioSnapshot.instructions,
            overrideCurrentUserMessage 
        );
        
        let aiResponseText = aiResponse.text || ""; 

        if (!aiResponseText.trim()) {
            aiResponseText = "[The storyteller pondered but offered no words. Perhaps try a different approach or ask to continue.]";
        }

        const aiTurn: AdventureTurn = {
            id: generateId(),
            role: 'model',
            text: aiResponseText, 
            timestamp: Date.now(),
            tokenUsage: tokenStats // Store stats with the AI turn
        };
        Rstate.activeAdventure.adventureHistory.push(aiTurn);
        if (formStatus) formStatus.textContent = "Storyteller responded.";

    } catch (error) {
        console.error("Error generating content:", error);
        const errorText = error instanceof Error ? error.message : "An unknown error occurred.";
        const errorTurn: AdventureTurn = {
            id: generateId(),
            role: 'model',
            text: `I encountered an error: ${errorText}. Please try again or adjust your last action.`,
            timestamp: Date.now()
            // No tokenUsage for error turns from app-side
        };
        Rstate.activeAdventure.adventureHistory.push(errorTurn);
        if (formStatus) formStatus.textContent = "Error receiving response from Storyteller.";
    } finally {
        Rstate.setIsLoadingAI(false);
        if (Rstate.activeAdventure) { 
            Rstate.activeAdventure.lastPlayedAt = Date.now();
            saveAdventuresToStorage();
        }
        renderGameplay(); 
        if (Rstate.isPlayerActionInputVisible && !Rstate.editingTurnId && !Rstate.globalSettingsVisible && !Rstate.editingAdventureDetailsCardId && !Rstate.showAddAdventureCardForm && !Rstate.isConfirmationModalVisible && !Rstate.isTokenStatsModalVisible) {
            document.getElementById('player-action')?.focus();
        } else if (!Rstate.isPlayerActionInputVisible && !Rstate.editingTurnId && !Rstate.globalSettingsVisible && !Rstate.isConfirmationModalVisible && !Rstate.isTokenStatsModalVisible) {
             const firstActionButton = document.querySelector('.action-button:not([disabled])') as HTMLButtonElement;
             firstActionButton?.focus();
        }
    }
}


async function submitPlayerAction(actionText: string, actionType: ActionType) {
    if (!Rstate.activeAdventure || Rstate.isLoadingAI) return;

    const formStatus = document.getElementById('player-action-form-status');
    if (formStatus) formStatus.textContent = "Sending your action...";

    const playerTurn: AdventureTurn = {
        id: generateId(),
        role: 'user',
        text: actionText,
        actionType: actionType,
        timestamp: Date.now()
        // No tokenUsage for user turns
    };
    Rstate.activeAdventure.adventureHistory.push(playerTurn);
    Rstate.setIsLoadingAI(true);
    renderGameplay(); 

    await generateAndProcessAIResponse();
}

export function handlePlayerActionTypeButtonClick(actionType: ActionType) {
    if (Rstate.isLoadingAI) return;
    
    if (Rstate.isPlayerActionInputVisible && Rstate.currentPlayerActionType === actionType) {
        Rstate.setIsPlayerActionInputVisible(false);
    } else {
        Rstate.setCurrentPlayerActionType(actionType);
        Rstate.setIsPlayerActionInputVisible(true);
    }
    renderGameplay(); 
    if (Rstate.isPlayerActionInputVisible) {
        setTimeout(() => document.getElementById('player-action')?.focus(), 0);
    }
}

export function handlePlayerInputAction(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const textarea = event.target as HTMLTextAreaElement;
        const playerActionText = textarea.value.trim();
        if (playerActionText) {
            submitPlayerAction(playerActionText, Rstate.currentPlayerActionType);
            textarea.value = ''; 
        }
    }
}

export async function handlePlayerActionSubmit(event: SubmitEvent) {
  event.preventDefault(); 
  if (!Rstate.activeAdventure || Rstate.isLoadingAI) return;

  const actionInput = document.getElementById('player-action') as HTMLTextAreaElement; 
  
  if (!actionInput) {
      console.error("Player action textarea not found.");
      return;
  }
  const playerActionText = actionInput.value.trim();

  if (!playerActionText) return;

  submitPlayerAction(playerActionText, Rstate.currentPlayerActionType);
  actionInput.value = ''; 
}

export function handleEditTurn(turnId: string) {
    if (!Rstate.activeAdventure) return;
    Rstate.setEditingTurnId(turnId);
    renderGameplay(); 
}

export function handleSaveInlineEdit(turnId: string) {
    if (!Rstate.activeAdventure) return;
    const adventure = Rstate.activeAdventure;
    const turnIndex = adventure.adventureHistory.findIndex(t => t.id === turnId);

    if (turnIndex === -1) {
        Rstate.setEditingTurnId(null); 
        renderGameplay();
        return;
    }
    
    const textarea = document.getElementById(`inline-edit-textarea-${turnId}`) as HTMLTextAreaElement;
    if (!textarea) {
        Rstate.setEditingTurnId(null);
        renderGameplay();
        return;
    }

    const newText = textarea.value.trim(); 
    const turnToEdit = adventure.adventureHistory[turnIndex];

    if (newText !== turnToEdit.text.trim()) { 
        turnToEdit.text = newText;
        turnToEdit.timestamp = Date.now();
    }

    Rstate.setEditingTurnId(null); 
    adventure.lastPlayedAt = Date.now();
    saveAdventuresToStorage();
    renderGameplay();
}

export function handleCancelInlineEdit() {
    Rstate.setEditingTurnId(null); 
    renderGameplay();
}

export function handleDeleteTurn(turnId: string) {
    if (!Rstate.activeAdventure) return;
    const adventure = Rstate.activeAdventure;
    const turnIndex = adventure.adventureHistory.findIndex(t => t.id === turnId);
    
    if (turnIndex === -1) return;
    const turnToDelete = adventure.adventureHistory[turnIndex];
    const turnTextPreview = turnToDelete.text.substring(0, 50) + (turnToDelete.text.length > 50 ? "..." : "");

    showConfirmationModal({
        title: "Delete Turn",
        message: `Are you sure you want to delete this turn: "${turnTextPreview}"? This action cannot be undone.`,
        confirmText: "Delete Turn",
        onConfirm: () => {
            if (!Rstate.activeAdventure) return; 
            const currentAdventure = Rstate.activeAdventure;
            const currentIndex = currentAdventure.adventureHistory.findIndex(t => t.id === turnId);
            if (currentIndex === -1) return; 

            currentAdventure.adventureHistory.splice(currentIndex, 1); 
                
            if (currentAdventure.adventureHistory.length === 0 && currentAdventure.scenarioSnapshot.openingScene) {
                currentAdventure.adventureHistory.push({
                    id: generateId(),
                    role: 'model',
                    text: currentAdventure.scenarioSnapshot.openingScene,
                    timestamp: Date.now()
                });
            }

            currentAdventure.lastPlayedAt = Date.now();
            saveAdventuresToStorage();
            renderGameplay();
        }
    });
}

export async function handleContinueAI() {
    if (!Rstate.activeAdventure || Rstate.isLoadingAI) return;
    const formStatus = document.getElementById('player-action-form-status');
    if (formStatus) formStatus.textContent = "Asking storyteller to continue...";
    
    Rstate.setIsLoadingAI(true);
    renderGameplay(); 

    const overrideMessage = "Continue the story."; 
    await generateAndProcessAIResponse(overrideMessage);
}

export async function handleRetryAI() {
    if (!Rstate.activeAdventure || Rstate.isLoadingAI) return;
    const adventure = Rstate.activeAdventure;
    const formStatus = document.getElementById('player-action-form-status');

    let lastModelTurnIndex = -1;
    for (let i = adventure.adventureHistory.length - 1; i >= 0; i--) {
        if (adventure.adventureHistory[i].role === 'model') {
            lastModelTurnIndex = i;
            break;
        }
    }

    if (lastModelTurnIndex === -1) {
        alert("No AI response to retry.");
        return;
    }

    if (formStatus) formStatus.textContent = "Retrying last AI response...";
    // Remove the last AI turn. The prompt will be constructed based on history up to the player turn before it.
    adventure.adventureHistory.splice(lastModelTurnIndex); 
    
    Rstate.setIsLoadingAI(true);
    renderGameplay(); 

    // The prompt will be rebuilt by getAIGeneration based on the modified history
    await generateAndProcessAIResponse();
}

export async function handleInspectTurn(turnId: string) {
    if (!Rstate.activeAdventure) return;
    const adventure = Rstate.activeAdventure;
    const turnIndex = adventure.adventureHistory.findIndex(t => t.id === turnId);
    if (turnIndex === -1) return;

    const inspectedTurn = adventure.adventureHistory[turnIndex];
    let statsToDisplay: TokenUsageStats | undefined | null = null;

    if (inspectedTurn.role === 'model') {
        statsToDisplay = inspectedTurn.tokenUsage;
    } else if (inspectedTurn.role === 'user') {
        if (turnIndex + 1 < adventure.adventureHistory.length) {
            const nextTurn = adventure.adventureHistory[turnIndex + 1];
            if (nextTurn.role === 'model') {
                statsToDisplay = nextTurn.tokenUsage;
            }
        }
    }

    if (statsToDisplay) {
        // Ensure model input token limit is available
        if (!Rstate.modelInputTokenLimits[statsToDisplay.modelUsed]) {
            await fetchSpecificModelInputLimit(statsToDisplay.modelUsed as AvailableTextModel);
        }
        Rstate.setTokenStatsForModal(statsToDisplay);
        Rstate.setIsTokenStatsModalVisible(true);
    } else {
        Rstate.setTokenStatsForModal(null);
        Rstate.setIsTokenStatsModalVisible(true); // Still show modal, but it will display a "no stats" message
    }
    renderApp(); // Re-render to show the modal or update it if limit was fetched
}
