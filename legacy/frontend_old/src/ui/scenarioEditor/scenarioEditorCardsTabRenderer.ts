
// src/ui/scenarioEditor/scenarioEditorCardsTabRenderer.ts
import * as Rstate from '../../state'; // Using Rstate alias for state imports here
import { escapeHTML } from '../../utils';
import type { Card, Scenario, NewScenarioScaffold, ScenarioSnapshot } from '../../types';

function renderCardsListForEditor(cards: Card[], editingCardId: string | null, displayType: 'grid' | 'list' | 'compact'): string {
    if (!cards || cards.length === 0) {
        if (Rstate.scenarioEditorCardSearchTerm || Rstate.scenarioEditorCardFilterType) {
            return "<p>No cards match your current filter.</p>";
        }
        return "<p>No cards added yet.</p>";
    }

    const cardItemsHtml = cards.map(card => {
        const displayTypeClass = displayType === 'grid' ? 'grid-view' :
                                 displayType === 'list' ? 'list-view' : 'compact-list-view';
        const cardHtmlClass = `card-item ${displayTypeClass} ${editingCardId === card.id ? 'editing' : ''}`;

        if (editingCardId === card.id) {
            // Editing mode for this card
            return `
                <div class="${cardHtmlClass}" data-id="${card.id}">
                    <h4>Editing Card: ${escapeHTML(card.name)}</h4>
                    <div class="form-group">
                        <label for="edit-scenario-card-type-${card.id}">Type:</label>
                        <input type="text" id="edit-scenario-card-type-${card.id}" value="${escapeHTML(card.type)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-scenario-card-name-${card.id}">Name:</label>
                        <input type="text" id="edit-scenario-card-name-${card.id}" value="${escapeHTML(card.name)}">
                    </div>
                    <div class="form-group">
                        <label for="edit-scenario-card-description-${card.id}">Description:</label>
                        <textarea id="edit-scenario-card-description-${card.id}" rows="3">${escapeHTML(card.description)}</textarea>
                    </div>
                    <div class="form-group">
                        <label for="edit-scenario-card-keys-${card.id}">Keys (single string, comma-separated internally if needed):</label>
                        <input type="text" id="edit-scenario-card-keys-${card.id}" value="${escapeHTML(card.keys || "")}">
                    </div>
                    <div class="card-item-actions">
                        <button type="button" class="save-scenario-card-changes-btn" data-card-id="${card.id}">Save Changes</button>
                        <button type="button" class="cancel-scenario-card-edit-btn secondary">Cancel</button>
                    </div>
                </div>
            `;
        } else {
            // Display mode for this card
            let descriptionContent = '';
            if (displayType === 'grid' || displayType === 'list') {
                descriptionContent = `<p class="card-description-preview">${escapeHTML(card.description)}</p>`;
            }
            // Compact view doesn't show description by default via CSS.

            return `
                <div class="${cardHtmlClass}" data-id="${card.id}" tabindex="0" aria-labelledby="card-title-${card.id}">
                    <h4 id="card-title-${card.id}">${escapeHTML(card.name)} (<span style="font-style: italic;">${escapeHTML(card.type)}</span>)</h4>
                    ${descriptionContent}
                    ${card.keys && card.keys.trim() ? `<small>Keys: ${escapeHTML(card.keys)}</small>` : ''}
                    <div class="card-item-actions">
                        <button type="button" class="edit-scenario-card-btn" data-card-id="${card.id}" aria-label="Edit card ${escapeHTML(card.name)}">Edit</button>
                        <button type="button" class="duplicate-card-editor-btn secondary" data-card-id="${card.id}" aria-label="Duplicate card ${escapeHTML(card.name)}">Duplicate</button>
                        <button type="button" class="delete-card-btn danger" data-card-id="${card.id}" aria-label="Delete card ${escapeHTML(card.name)}">Delete</button>
                    </div>
                </div>
            `;
        }
    }).join('');
    
    const listContainerClass = displayType === 'grid' ? 'cards-list-container grid-view' : 'cards-list-container';
    return `<div id="cards-list" class="${listContainerClass}" aria-live="polite">${cardItemsHtml}</div>`;
}

export function renderScenarioEditorCardsTab(
    scenarioDataSource: Scenario | NewScenarioScaffold | ScenarioSnapshot,
    showAddCardForm: boolean,
    editingCardId: string | null,
    searchTerm: string,
    filterType: string,
    displayType: 'grid' | 'list' | 'compact'
): string {

  let cardsToRender = scenarioDataSource.cards || [];
  if (filterType) {
      cardsToRender = cardsToRender.filter(card => card.type.toLowerCase() === filterType.toLowerCase());
  }
  if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      cardsToRender = cardsToRender.filter(card => 
          card.name.toLowerCase().includes(lowerSearchTerm) ||
          card.type.toLowerCase().includes(lowerSearchTerm) ||
          card.description.toLowerCase().includes(lowerSearchTerm) ||
          (card.keys && card.keys.toLowerCase().includes(lowerSearchTerm))
      );
  }

  const uniqueCardTypes = scenarioDataSource.cards ? 
    [...new Set(scenarioDataSource.cards.map(card => card.type.trim()).filter(type => type))] : [];

  const addCardFormHtml = showAddCardForm ? `
    <div class="card-form">
        <h4>Add New Card</h4>
        <div class="form-group">
            <label for="card-type">Card Type (e.g., character, location):</label>
            <input type="text" id="card-type" value="character">
        </div>
        <div class="form-group">
            <label for="card-name">Card Name:</label>
            <input type="text" id="card-name">
        </div>
        <div class="form-group">
            <label for="card-description">Card Description:</label>
            <textarea id="card-description" rows="3"></textarea>
        </div>
        <div class="form-group">
            <label for="card-keys">Keys (single string, comma-separated internally if needed):</label>
            <input type="text" id="card-keys">
        </div>
        <button type="button" id="add-card-btn">Add This Card</button>
        <button type="button" id="cancel-add-scenario-card-btn" class="secondary">Cancel Add</button>
    </div>
  ` : `<button type="button" id="toggle-add-scenario-card-form-btn" class="secondary" style="margin-top: 1rem;">Add New Card</button>`;

  return `
    <div id="cards-tab-content" role="tabpanel" aria-labelledby="cards-tab-button">
        <div class="card-management-actions" style="margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem;">
            <button type="button" id="import-cards-btn" class="secondary">Import Cards (JSON)</button>
            <input type="file" id="import-cards-file-input" accept=".json" style="display:none;">
            <button type="button" id="export-cards-btn" class="secondary">Export Cards (JSON)</button>
            <button type="button" id="import-aid-cards-btn" class="secondary">Import AID Cards (JSON)</button>
            <input type="file" id="import-aid-cards-file-input" accept=".json" style="display:none;">
            <button type="button" id="export-aid-cards-btn" class="secondary">Export AID Cards (JSON)</button>
        </div>
        ${addCardFormHtml}
        <hr style="border-color: var(--border-color); margin: 1.5rem 0;">
        
        <div class="cards-controls-bar">
            <div class="cards-filter-bar">
                <input type="text" id="card-search-input" placeholder="Search cards by name, type, desc, keys..." value="${escapeHTML(searchTerm)}" aria-label="Search cards">
                <select id="card-type-filter" aria-label="Filter cards by type">
                    <option value="">All Types</option>
                    ${uniqueCardTypes.map(type => `<option value="${escapeHTML(type)}" ${filterType === type ? 'selected' : ''}>${escapeHTML(type)}</option>`).join('')}
                     ${uniqueCardTypes.length === 0 && scenarioDataSource.cards && scenarioDataSource.cards.length > 0 ? '<option value="" disabled>No distinct types found</option>' : ''}
                </select>
            </div>
            <div class="display-style-switcher" role="radiogroup" aria-label="Card display style">
                <button type="button" class="display-style-btn ${displayType === 'grid' ? 'active' : ''}" data-display="grid" aria-pressed="${displayType === 'grid'}">Grid</button>
                <button type="button" class="display-style-btn ${displayType === 'list' ? 'active' : ''}" data-display="list" aria-pressed="${displayType === 'list'}">List</button>
                <button type="button" class="display-style-btn ${displayType === 'compact' ? 'active' : ''}" data-display="compact" aria-pressed="${displayType === 'compact'}">Compact</button>
            </div>
        </div>
        ${renderCardsListForEditor(cardsToRender, editingCardId, displayType)}
    </div>
  `;
}
