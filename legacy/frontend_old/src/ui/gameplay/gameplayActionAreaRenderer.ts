
// src/ui/gameplay/gameplayActionAreaRenderer.ts
import type { ActionType } from '../../types';
import * as state from '../../state'; // For isLoadingAI and currentPlayerActionType

function getActionTextareaPlaceholder(actionType: ActionType): string {
    switch (actionType) {
        case 'do': return 'What do you do? (Press Enter to send)';
        case 'say': return 'What do you say? (Press Enter to send)';
        case 'story': return 'Narrate a part of the story... (Press Enter to send)';
        default: return 'Enter your action... (Press Enter to send)';
    }
}

export function renderGameplayActionArea(currentPlayerActionType: ActionType, isPlayerActionInputVisible: boolean, isLoadingAI: boolean): string {
  const placeholder = getActionTextareaPlaceholder(currentPlayerActionType);
  return `
    <div class="gameplay-action-area">
        <div class="action-button-group">
            <button type="button" id="action-type-do" class="action-button ${currentPlayerActionType === 'do' && isPlayerActionInputVisible ? 'active' : ''}" data-actiontype="do" ${isLoadingAI ? 'disabled aria-disabled="true"' : ''}>Do</button>
            <button type="button" id="action-type-say" class="action-button ${currentPlayerActionType === 'say' && isPlayerActionInputVisible ? 'active' : ''}" data-actiontype="say" ${isLoadingAI ? 'disabled aria-disabled="true"' : ''}>Say</button>
            <button type="button" id="action-type-story" class="action-button ${currentPlayerActionType === 'story' && isPlayerActionInputVisible ? 'active' : ''}" data-actiontype="story" ${isLoadingAI ? 'disabled aria-disabled="true"' : ''}>Story</button>
        </div>
        
        ${isPlayerActionInputVisible ? `
            <form id="player-action-form" aria-labelledby="player-action-label">
                <div class="form-group">
                    <label for="player-action" id="player-action-label" class="sr-only">Your action input</label>
                    <textarea id="player-action" name="action" rows="2" required ${isLoadingAI ? 'disabled aria-disabled="true"' : ''} aria-describedby="player-action-form-status" placeholder="${placeholder}"></textarea>
                </div>
                <div id="player-action-form-status" class="sr-only" role="status"></div>
            </form>
        ` : ''}
        
        <div class="gameplay-utility-actions">
            <button type="button" id="retry-ai-btn" class="secondary" ${isLoadingAI || (state.activeAdventure?.adventureHistory.filter(t => t.role === 'model').length === 0) ? 'disabled aria-disabled="true"' : ''}>Retry</button>
            <button type="button" id="continue-ai-btn" class="secondary" ${isLoadingAI ? 'disabled aria-disabled="true"' : ''}>Continue</button>
        </div>
    </div>
  `;
}
