
// src/ui/gameplay/gameplaySidebarCardsTabRenderer.ts
import { escapeHTML } from '../../utils';
import type { Card } from '../../types';

function renderAdventureCardsInSidebar(cards: Card[], editingCardId: string | null): string {
    if (!cards || cards.length === 0) return "<p>No cards defined for this adventure.</p>";
    return cards.map(card => {
        if (editingCardId === card.id) {
            return `
                <div class="card-item editing" data-card-id="${card.id}">
                    <h4>Editing Card:</h4>
                    <div class="form-group">
                        <label for="edit-card-type-${card.id}">Type:</label>
                        <input type="text" id="edit-card-type-${card.id}" value="${escapeHTML(card.type)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-card-name-${card.id}">Name:</label>
                        <input type="text" id="edit-card-name-${card.id}" value="${escapeHTML(card.name)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-card-description-${card.id}">Description:</label>
                        <textarea id="edit-card-description-${card.id}" rows="3">${escapeHTML(card.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="edit-card-keys-${card.id}">Keys (single string):</label>
                        <input type="text" id="edit-card-keys-${card.id}" value="${escapeHTML(card.keys || "")}">
                    </div>
                    <div class="card-item-actions">
                        <button type="button" class="save-adventure-card-btn" data-card-id="${card.id}">Save Card Changes</button>
                        <button type="button" class="cancel-adventure-card-edit-btn secondary">Cancel</button>
                    </div>
                </div>
            `;
        } else {
            return `
                <div class="card-item" data-card-id="${card.id}" tabindex="0" aria-labelledby="adv-card-title-${card.id}">
                    <h4 id="adv-card-title-${card.id}">${escapeHTML(card.name)} (<span style="font-style: italic;">${escapeHTML(card.type)}</span>)</h4>
                    <p class="card-description-preview">${escapeHTML(card.description)}</p> 
                    ${card.keys && card.keys.trim() ? `<small>Keys: ${escapeHTML(card.keys)}</small>` : ''}
                    <div class="card-item-actions">
                        <button type="button" class="edit-adventure-card-btn" data-card-id="${card.id}">Edit</button>
                        <button type="button" class="duplicate-adventure-card-btn secondary" data-card-id="${card.id}">Duplicate</button>
                        <button type="button" class="delete-adventure-card-btn danger" data-card-id="${card.id}">Delete</button>
                    </div>
                </div>
            `;
        }
    }).join('');
}

export function renderGameplaySidebarCardsTab(
    cards: Card[], 
    editingCardId: string | null, 
    showAddCardForm: boolean
): string {
  const addCardFormHtml = showAddCardForm ? `
    <div class="card-form" style="margin-top: 1rem; border-top: 1px solid var(--border-color); padding-top: 1rem;">
        <h4>Add New Card to this Adventure</h4>
        <div class="form-group">
            <label for="add-adventure-card-type">Type:</label>
            <input type="text" id="add-adventure-card-type" value="misc">
        </div>
        <div class="form-group">
            <label for="add-adventure-card-name">Name:</label>
            <input type="text" id="add-adventure-card-name">
        </div>
        <div class="form-group">
            <label for="add-adventure-card-description">Description:</label>
            <textarea id="add-adventure-card-description" rows="2"></textarea>
        </div>
        <div class="form-group">
            <label for="add-adventure-card-keys">Keys (single string):</label>
            <input type="text" id="add-adventure-card-keys">
        </div>
        <button type="button" id="add-adventure-card-submit-btn">Add This Card</button>
        <button type="button" id="cancel-add-adventure-card-btn" class="secondary">Cancel Add</button>
    </div>
  ` : `<button type="button" id="toggle-add-adventure-card-form-btn" class="secondary" style="margin-top: 1rem;">Add New Card</button>`;

  return `
    <div id="gside-panel-cards" role="tabpanel" tabindex="0" aria-labelledby="gside-tab-cards">
         <div id="adventure-cards-list" aria-live="polite">
            ${renderAdventureCardsInSidebar(cards, editingCardId)}
        </div>
        ${addCardFormHtml}
    </div>
  `;
}
