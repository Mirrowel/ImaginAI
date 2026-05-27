// src/eventHandlers/gameplayEventHandlers.ts
import * as Rstate from '../state';
import { renderApp } from '../viewManager';
import type { AdventureTurn, ActionType, TokenUsageStats } from '../types';
import { renderGameplay } from '../ui/gameplay';
import { showConfirmationModal } from './modalEventHandlers';
import * as gemini from '../geminiService';
import * as api from '../apiService';
import { saveAdventureToAPI } from '../storage';

async function handlePlayerAction(actionPromise: Promise<gemini.AIGenerationResult>, playerTurn?: AdventureTurn) {
    if (!Rstate.activeAdventure) return;
    const adventureId = Rstate.activeAdventure.id;

    const formStatus = document.getElementById('player-action-form-status');
    if (formStatus) formStatus.textContent = "Sending your action...";

    Rstate.setIsLoadingAI(true);
    
    // Optimistically add the player's turn to the UI
    if (playerTurn) {
        Rstate.activeAdventure.adventureHistory.push(playerTurn);
    }
    renderGameplay();

    try {
        // Wait for the backend to process the action
        await actionPromise;

        // Now that the action is processed, fetch the definitive state from the backend
        const updatedAdventure = await api.getAdventure(adventureId);
        Rstate.setActiveAdventure(updatedAdventure);

    } catch (error) {
        console.error("Failed to process player action and update adventure:", error);
        // Optionally, refetch the adventure to revert the optimistic update
        try {
            const revertedAdventure = await api.getAdventure(adventureId);
            Rstate.setActiveAdventure(revertedAdventure);
        } catch (fetchError) {
            console.error("Failed to refetch adventure after an error:", fetchError);
            // If refetch fails, we might be in a bad state.
            // For now, we'll just log it. A more robust solution could navigate away or show a global error.
        }
    } finally {
        Rstate.setIsLoadingAI(false);
        renderGameplay();
    }
}

async function submitPlayerAction(actionText: string, actionType: ActionType) {
    if (!Rstate.activeAdventure || Rstate.isLoadingAI) return;

    const playerTurn: AdventureTurn = {
        id: `temp-user-${Date.now()}`, // Backend will assign a real ID
        role: 'user',
        text: actionText,
        actionType: actionType,
        timestamp: Date.now()
    };

    await handlePlayerAction(gemini.generateTurn(Rstate.activeAdventure.id, actionText, actionType, Rstate.selectedModel, Rstate.globalMaxOutputTokens, Rstate.allowAiThinking), playerTurn);
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

export async function handleSaveInlineEdit(turnId: string) {
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
        await saveAdventureToAPI(adventure);
    }

    Rstate.setEditingTurnId(null);
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
        onConfirm: async () => {
            if (!Rstate.activeAdventure) return;
            const currentAdventure = Rstate.activeAdventure;
            const currentIndex = currentAdventure.adventureHistory.findIndex(t => t.id === turnId);
            if (currentIndex === -1) return;

            currentAdventure.adventureHistory.splice(currentIndex, 1);
            await saveAdventureToAPI(currentAdventure);
            renderGameplay();
        }
    });
}

export async function handleContinueAI() {
    if (!Rstate.activeAdventure || Rstate.isLoadingAI) return;
    await handlePlayerAction(gemini.continueAI(Rstate.activeAdventure.id, Rstate.selectedModel, Rstate.globalMaxOutputTokens, Rstate.allowAiThinking));
}

export async function handleRetryAI() {
    if (!Rstate.activeAdventure || Rstate.isLoadingAI) return;
    
    let lastModelTurnIndex = -1;
    for (let i = Rstate.activeAdventure.adventureHistory.length - 1; i >= 0; i--) {
        if (Rstate.activeAdventure.adventureHistory[i].role === 'model') {
            lastModelTurnIndex = i;
            break;
        }
    }

    if (lastModelTurnIndex === -1) {
        alert("No AI response to retry.");
        return;
    }

    // Remove the last model turn and any subsequent user turns.
    Rstate.activeAdventure.adventureHistory.splice(lastModelTurnIndex);

    await handlePlayerAction(gemini.retryAI(Rstate.activeAdventure.id, Rstate.selectedModel, Rstate.globalMaxOutputTokens, Rstate.allowAiThinking));
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
        Rstate.setTokenStatsForModal(statsToDisplay);
        Rstate.setIsTokenStatsModalVisible(true);
        renderApp();
    } else {
        // Do not open the modal if there are no stats.
    }
}
