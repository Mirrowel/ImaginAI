
// src/ui/gameplay/gameplayHistoryRenderer.ts
import { escapeHTML, sanitizeAndRenderMarkdown } from '../../utils';
import type { AdventureTurn } from '../../types';

function formatPlayerTurnForDisplay(turn: AdventureTurn): string {
    const renderedText = sanitizeAndRenderMarkdown(turn.text);
    const type = turn.actionType || 'do';
    let prefix = '';
    switch (type) {
        case 'say': prefix = `<strong>You Say:</strong>`; break;
        case 'do': prefix = `<strong>You Do:</strong>`; break;
        case 'story': prefix = `<strong>You Narrate:</strong>`; break;
        default: prefix = `<strong>You:</strong>`; break;
    }
    return `${prefix}<div class="markdown-content">${renderedText}</div>`;
}

export function renderGameplayHistoryLog(adventureHistory: AdventureTurn[], editingTurnId: string | null): string {
  return `
    <div class="history-log" id="history-log" aria-live="polite" aria-relevant="additions">
      ${adventureHistory.map(turn => {
        if (editingTurnId === turn.id) {
          return `
            <div class="history-item ${turn.role === 'user' ? 'user-turn' : ''}" data-turn-id="${turn.id}" tabindex="0" aria-label="Editing turn: ${escapeHTML(turn.text.substring(0,100))}">
              <strong>${turn.role === 'user' ? 'You (Editing)' : 'Story (Editing)'}:</strong>
              <textarea id="inline-edit-textarea-${turn.id}" class="inline-edit-textarea" rows="4" style="width: calc(100% - 16px); margin-top: 5px; margin-bottom: 5px; box-sizing: border-box; background-color: var(--surface-color); color: var(--text-primary); border: 1px solid var(--border-color); border-radius: var(--border-radius);">${escapeHTML(turn.text)}</textarea>
              <div class="history-item-actions" style="position: static; display: flex;">
                <button class="save-inline-edit-btn" data-turn-id="${turn.id}" aria-label="Save changes to this turn">Save</button>
                <button class="cancel-inline-edit-btn secondary" aria-label="Cancel editing this turn">Cancel</button>
              </div>
            </div>
          `;
        } else {
          return `
            <div class="history-item ${turn.role === 'user' ? 'user-turn' : ''}" data-turn-id="${turn.id}" tabindex="0" aria-label="${turn.role === 'user' ? 'Your ' + (turn.actionType || 'action') : 'Story continuation'}: ${escapeHTML(turn.text.substring(0,100))}">
              ${turn.role === 'user' ? formatPlayerTurnForDisplay(turn) : `<div class="markdown-content">${sanitizeAndRenderMarkdown(turn.text)}</div>`}
              <div class="history-item-actions">
                 <button class="edit-turn-btn" data-turn-id="${turn.id}" aria-label="Edit this turn: ${escapeHTML(turn.text.substring(0,50))}">Edit</button>
                 <button class="delete-turn-btn danger" data-turn-id="${turn.id}" aria-label="Delete this turn: ${escapeHTML(turn.text.substring(0,50))}">Delete</button>
              </div>
            </div>
          `;
        }
      }).join('')}
    </div>
  `;
}
