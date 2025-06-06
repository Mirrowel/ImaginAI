// src/eventHandlers/cardEventHandlers.ts
import * as Rstate from '../state';
import { renderScenarioEditor, renderGameplay } from '../ui'; // UI updaters
import type { Card } from '../types';
import { scenarioEditorView } from '../domElements'; // For focusing

// Simple client-side ID generator for temporary items
const tempId = () => `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- Scenario Editor Card Handlers ---

export function handleAddCardToEditor() {
    const editorContext = Rstate.currentEditorContext;
    if (!editorContext || editorContext.type !== 'scenario') { // Ensure it's scenario context for this specific handler
        console.warn("handleAddCardToEditor called in non-scenario or missing context.");
        return;
    }

    const typeInput = document.getElementById('card-type') as HTMLInputElement;
    const nameInput = document.getElementById('card-name') as HTMLInputElement;
    const descriptionInput = document.getElementById('card-description') as HTMLTextAreaElement;
    const keysInput = document.getElementById('card-keys') as HTMLInputElement;

    if (!typeInput || !nameInput || !descriptionInput || !keysInput) {
        console.error("Card form input fields not found in scenario editor.");
        return;
    }

    const type = typeInput.value.trim() || 'misc';
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    const keys = keysInput.value.trim();

    if (!name) {
        alert('Card name is required.');
        nameInput.focus();
        return;
    }
    
    const newCard: Card = { id: tempId(), type, name, description, keys };
    
    editorContext.data.cards.push(newCard); 

    nameInput.value = '';
    descriptionInput.value = '';
    keysInput.value = '';

    Rstate.setShowAddScenarioCardForm(false); 
    renderScenarioEditor(); 
    setTimeout(() => document.getElementById('toggle-add-scenario-card-form-btn')?.focus(), 0);
}

export function handleDeleteCardFromEditor(cardId: string) {
    const editorContext = Rstate.currentEditorContext;
    if (!editorContext) {
        alert("Cannot delete card: No active editing context.");
        return;
    }
    if (!cardId) return;

    let cardsArrayRef: Card[];
    if (editorContext.type === 'scenario') {
        cardsArrayRef = editorContext.data.cards;
        editorContext.data.cards = cardsArrayRef.filter(c => c.id !== cardId);
    } else { // adventure type, modifying snapshot
        cardsArrayRef = editorContext.data.scenarioSnapshot.cards;
        editorContext.data.scenarioSnapshot.cards = cardsArrayRef.filter(c => c.id !== cardId);
    }

    if (Rstate.editingScenarioEditorCardId === cardId) {
        Rstate.setEditingScenarioEditorCardId(null);
    }
    renderScenarioEditor(); // Re-render editor view
    setTimeout(() => {
        const addCardButton = scenarioEditorView.querySelector<HTMLButtonElement>('#toggle-add-scenario-card-form-btn');
        addCardButton?.focus();
    }, 0);
}

export function handleToggleShowAddScenarioCardForm() {
    const newShowState = !Rstate.showAddScenarioCardForm;
    Rstate.setShowAddScenarioCardForm(newShowState);
    if (newShowState) {
        Rstate.setEditingScenarioEditorCardId(null); 
    }
    renderScenarioEditor();
    setTimeout(() => {
        if (newShowState) {
            document.getElementById('card-type')?.focus();
        } else {
            document.getElementById('toggle-add-scenario-card-form-btn')?.focus();
        }
    }, 0);
}

export function handleCancelAddScenarioCardForm() {
    Rstate.setShowAddScenarioCardForm(false);
    renderScenarioEditor();
    setTimeout(() => {
        document.getElementById('toggle-add-scenario-card-form-btn')?.focus();
    }, 0);
}

export function handleEditScenarioCard(cardId: string) {
    Rstate.setEditingScenarioEditorCardId(cardId);
    Rstate.setShowAddScenarioCardForm(false); 
    renderScenarioEditor();
    setTimeout(() => {
        document.getElementById(`edit-scenario-card-type-${cardId}`)?.focus();
    }, 0);
}

export function handleCancelScenarioCardEdit() {
    const cardId = Rstate.editingScenarioEditorCardId;
    Rstate.setEditingScenarioEditorCardId(null);
    renderScenarioEditor();
    if (cardId) {
      setTimeout(() => {
          const cardElement = scenarioEditorView.querySelector(`.card-item[data-id="${cardId}"] .edit-scenario-card-btn`);
          (cardElement as HTMLElement)?.focus();
      }, 0);
    }
}

export function handleSaveScenarioCardChanges(cardId: string) {
    const editorContext = Rstate.currentEditorContext;
    if (!editorContext) {
        alert("Cannot save card changes: No active editing context.");
        Rstate.setEditingScenarioEditorCardId(null);
        renderScenarioEditor();
        return;
    }

    let cardsArrayRef: Card[];
    if (editorContext.type === 'scenario') {
        cardsArrayRef = editorContext.data.cards;
    } else if (editorContext.type === 'adventure') {
        cardsArrayRef = editorContext.data.scenarioSnapshot.cards;
    } else {
        alert("Cannot save card changes: Invalid editor context type.");
        Rstate.setEditingScenarioEditorCardId(null);
        renderScenarioEditor();
        return;
    }

    const cardIndex = cardsArrayRef.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        alert("Error: Card to save not found.");
        Rstate.setEditingScenarioEditorCardId(null);
        renderScenarioEditor();
        return;
    }

    const typeInput = document.getElementById(`edit-scenario-card-type-${cardId}`) as HTMLInputElement;
    const nameInput = document.getElementById(`edit-scenario-card-name-${cardId}`) as HTMLInputElement;
    const descriptionTextarea = document.getElementById(`edit-scenario-card-description-${cardId}`) as HTMLTextAreaElement;
    const keysInput = document.getElementById(`edit-scenario-card-keys-${cardId}`) as HTMLInputElement;

    if (!typeInput || !nameInput || !descriptionTextarea || !keysInput) {
        alert("Error: Could not find input fields to save card changes.");
        return; 
    }
    
    const keys = keysInput.value.trim();

    const updatedCard: Card = {
        id: cardId,
        type: typeInput.value.trim() || 'misc',
        name: nameInput.value.trim(),
        description: descriptionTextarea.value.trim(),
        keys: keys
    };

    if (!updatedCard.name) { 
        alert("Card name cannot be empty.");
        nameInput.focus();
        return;
    }

    cardsArrayRef[cardIndex] = updatedCard;
    Rstate.setEditingScenarioEditorCardId(null);
    renderScenarioEditor();
    setTimeout(() => {
        const cardElement = scenarioEditorView.querySelector(`.card-item[data-id="${cardId}"]`);
        (cardElement as HTMLElement)?.focus();
    }, 0);
}

export function handleDuplicateCardInEditor(cardId: string) {
    const editorContext = Rstate.currentEditorContext;
    if (!editorContext) {
        alert("Cannot duplicate card: No active editing context.");
        return;
    }

    let cardsArrayRef: Card[];
    if (editorContext.type === 'scenario') {
        cardsArrayRef = editorContext.data.cards;
    } else { // adventure type
        cardsArrayRef = editorContext.data.scenarioSnapshot.cards;
    }

    const originalCardIndex = cardsArrayRef.findIndex(c => c.id === cardId);
    if (originalCardIndex === -1) {
        alert("Error: Card to duplicate not found.");
        return;
    }
    const originalCard = cardsArrayRef[originalCardIndex];
    const newCard: Card = JSON.parse(JSON.stringify(originalCard)); 
    newCard.id = tempId();
    newCard.name = `${originalCard.name} (Copy)`;
    
    cardsArrayRef.splice(originalCardIndex + 1, 0, newCard); 
    renderScenarioEditor(); 
}


// --- Card Import/Export Handlers (for Scenario Editor) ---
export function handleExportCards() {
    const editorContext = Rstate.currentEditorContext;
    if (!editorContext) {
        alert("No editor context to export cards from.");
        return;
    }
    
    const cardsFromContext = (editorContext.type === 'scenario') 
        ? editorContext.data.cards 
        : editorContext.data.scenarioSnapshot.cards;

    if (!cardsFromContext || cardsFromContext.length === 0) {
        alert("No cards to export.");
        return;
    }

    const cardsToExport = cardsFromContext.map(({ id, ...cardData }) => ({
        type: cardData.type,
        name: cardData.name,
        description: cardData.description,
        keys: cardData.keys || "" 
    }));

    const jsonData = JSON.stringify(cardsToExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'cards_export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function handleImportCardsTrigger() {
    const fileInput = document.getElementById('import-cards-file-input') as HTMLInputElement;
    fileInput?.click();
}

type RawImportedCard = {
    type: string;
    name: string;
    description: string;
    keys?: string | string[] | any;
};

function isValidCardImportData(data: any): data is RawImportedCard[] {
    if (!Array.isArray(data)) return false;
    return data.every(item =>
        typeof item === 'object' && item !== null &&
        typeof item.type === 'string' &&
        typeof item.name === 'string' &&
        typeof item.description === 'string'
    );
}

export function handleImportCardsFileSelected(event: Event) {
    const editorContext = Rstate.currentEditorContext;
    if (!editorContext) {
        alert("No editor context to import cards into.");
        return;
    }

    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const parsedData = JSON.parse(content);

            if (!isValidCardImportData(parsedData)) {
                alert("Invalid card data format.");
                return;
            }

            const importedCardsWithNewIds: Card[] = parsedData.map(rawCard => {
                let processedKeys: string = "";
                if (rawCard.keys) {
                    if (typeof rawCard.keys === 'string') {
                        processedKeys = rawCard.keys.trim();
                    } else if (Array.isArray(rawCard.keys)) {
                        processedKeys = rawCard.keys.map(k => String(k).trim()).filter(k => k).join(', ');
                    }
                }
                return {
                    id: tempId(), 
                    type: rawCard.type || 'misc',
                    name: rawCard.name || 'Unnamed Card',
                    description: rawCard.description || '',
                    keys: processedKeys
                };
            });

            if (editorContext.type === 'scenario') {
                editorContext.data.cards = importedCardsWithNewIds;
            } else { 
                editorContext.data.scenarioSnapshot.cards = importedCardsWithNewIds;
            }
            
            alert(`${importedCardsWithNewIds.length} cards imported successfully, replacing existing cards.`);
            renderScenarioEditor();

        } catch (error) {
            console.error("Error importing cards:", error);
            alert("Failed to import cards.");
        } finally {
            input.value = ''; 
        }
    };
    reader.onerror = () => { alert("Error reading file."); input.value = ''; };
    reader.readAsText(file);
}

// AI Dungeon Format
interface AIDungeonCard {
    keys: string; value: string; type: string; title: string; description: string; useForCharacterCreation: boolean;
}
type RawAIDImportCard = {
    keys?: string; value?: string; type?: string; title?: string; description?: string; useForCharacterCreation?: boolean;
};

export function handleExportAIDCards() {
    const editorContext = Rstate.currentEditorContext;
    if (!editorContext) { alert("No context for export."); return; }
    const cardsFromContext = (editorContext.type === 'scenario') ? editorContext.data.cards : editorContext.data.scenarioSnapshot.cards;
    if (!cardsFromContext || cardsFromContext.length === 0) { alert("No cards to export."); return; }

    const aidCardsToExport: AIDungeonCard[] = cardsFromContext.map(card => ({
        keys: card.keys || "", value: card.description, type: card.type, title: card.name, description: "", useForCharacterCreation: false
    }));

    const jsonData = JSON.stringify(aidCardsToExport, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'aid_cards_export.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function handleImportAIDCardsTrigger() {
    const fileInput = document.getElementById('import-aid-cards-file-input') as HTMLInputElement;
    fileInput?.click();
}

function isValidAIDCardImportData(data: any): data is RawAIDImportCard[] {
    if (!Array.isArray(data)) return false;
    return data.every(item => typeof item === 'object' && item !== null && item.hasOwnProperty('title') && typeof item.title === 'string' && ( (item.hasOwnProperty('value') && typeof item.value === 'string') || (item.hasOwnProperty('description') && typeof item.description === 'string') ));
}

export function handleImportAIDCardsFileSelected(event: Event) {
    const editorContext = Rstate.currentEditorContext;
    if (!editorContext) { alert("No context for import."); return; }
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const parsedData = JSON.parse(content);
            if (!isValidAIDCardImportData(parsedData)) { alert("Invalid AID card data format."); return; }

            const importedCardsTransformed: Card[] = parsedData.map(aidCard => ({
                id: tempId(), type: aidCard.type || 'misc', name: aidCard.title || 'Unnamed Card', description: aidCard.value || aidCard.description || '', keys: (typeof aidCard.keys === 'string' ? aidCard.keys.trim() : "")
            })).filter(card => card.name !== 'Unnamed Card' || card.description);

            if (editorContext.type === 'scenario') {
                editorContext.data.cards = importedCardsTransformed;
            } else { 
                editorContext.data.scenarioSnapshot.cards = importedCardsTransformed;
            }
            alert(`${importedCardsTransformed.length} AID cards imported successfully.`);
            renderScenarioEditor();
        } catch (error) { console.error("Error importing AID cards:", error); alert("Failed to import AID cards.");
        } finally { input.value = ''; }
    };
    reader.onerror = () => { alert("Error reading file."); input.value = ''; };
    reader.readAsText(file);
}


// --- Gameplay Sidebar Card Handlers ---

export function handleEditAdventureCard(cardId: string) {
    if (!Rstate.activeAdventure) return;
    Rstate.setIsGameplaySidebarVisible(true);
    Rstate.setCurrentGameplaySidebarTab('cards');
    Rstate.setEditingAdventureDetailsCardId(cardId);
    Rstate.setShowAddAdventureCardForm(false); // Close add form if open
    renderGameplay();
    setTimeout(() => { 
        const firstInput = document.getElementById(`edit-card-type-${cardId}`) as HTMLInputElement;
        firstInput?.focus();
    }, 0);
}

export function handleCancelAdventureCardEdit() {
    if (!Rstate.activeAdventure) return;
    const cardId = Rstate.editingAdventureDetailsCardId;
    Rstate.setEditingAdventureDetailsCardId(null);
    renderGameplay();
    if (cardId) {
        setTimeout(() => {
            const cardElement = document.querySelector(`.card-item[data-card-id="${cardId}"]`);
            cardElement?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
            (cardElement?.querySelector('.edit-adventure-card-btn') as HTMLElement)?.focus();
        }, 0);
    }
}

export async function handleSaveAdventureCardChanges(cardId: string) { // Made async
    if (!Rstate.activeAdventure) return;

    const cardIndex = Rstate.activeAdventure.scenarioSnapshot.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        console.error("Card to save not found in adventure snapshot:", cardId);
        Rstate.setEditingAdventureDetailsCardId(null);
        renderGameplay();
        return;
    }

    const typeInput = document.getElementById(`edit-card-type-${cardId}`) as HTMLInputElement;
    const nameInput = document.getElementById(`edit-card-name-${cardId}`) as HTMLInputElement;
    const descriptionTextarea = document.getElementById(`edit-card-description-${cardId}`) as HTMLTextAreaElement;
    const keysInput = document.getElementById(`edit-card-keys-${cardId}`) as HTMLInputElement;

    if (!typeInput || !nameInput || !descriptionTextarea || !keysInput) {
        console.error("One or more input fields for editing card not found.");
        Rstate.setEditingAdventureDetailsCardId(null);
        renderGameplay();
        return;
    }

    const keys = keysInput.value.trim();

    const updatedCardData: Partial<Card> = {
        type: typeInput.value.trim() || 'misc',
        name: nameInput.value.trim(),
        description: descriptionTextarea.value.trim(),
        keys: keys
    };

    if (!updatedCardData.name) {
        alert("Card name cannot be empty.");
        nameInput.focus();
        return;
    }

    try {
        const response = await fetch(`/api/adventures/${Rstate.activeAdventure.id}/edit_card_in_snapshot/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ card_id: cardId, updated_card: updatedCardData }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to save adventure card changes:', response.status, errorData);
            alert(`Failed to save card changes: ${errorData.detail || JSON.stringify(errorData)}`);
        } else {
            const responseData = await response.json();
            console.log("Adventure card changes saved successfully.", responseData);

            Rstate.activeAdventure.scenarioSnapshot.cards[cardIndex] = { ...Rstate.activeAdventure.scenarioSnapshot.cards[cardIndex], ...updatedCardData, id: cardId };
            Rstate.activeAdventure.lastPlayedAt = Date.now();
        }

    } catch (error) {
        console.error('Error saving adventure card changes:', error);
        alert('An error occurred while trying to save the card changes.');
    }

    Rstate.setEditingAdventureDetailsCardId(null);
    renderGameplay();
    setTimeout(() => {
        const cardElement = document.querySelector(`.card-item[data-card-id="${cardId}"]`);
        cardElement?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
        (cardElement?.querySelector('.edit-adventure-card-btn') as HTMLElement)?.focus();
    }, 0);
}

export async function handleDeleteAdventureCard(cardId: string) { // Made async
    if (!Rstate.activeAdventure) return;

    const cardIndex = Rstate.activeAdventure.scenarioSnapshot.cards.findIndex(c => c.id === cardId);
    if (cardIndex === -1) {
        console.error("Card to delete not found in adventure snapshot:", cardId);
        renderGameplay();
        return;
    }

    try {
        const response = await fetch(`/api/adventures/${Rstate.activeAdventure.id}/delete_card_from_snapshot/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ card_id: cardId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to delete adventure card:', response.status, errorData);
            alert(`Failed to delete card: ${errorData.detail || JSON.stringify(errorData)}`);
        } else {
            Rstate.activeAdventure.scenarioSnapshot.cards.splice(cardIndex, 1);
            Rstate.activeAdventure.lastPlayedAt = Date.now();
            console.log("Adventure card deleted successfully.");
        }

    } catch (error) {
        console.error('Error deleting adventure card:', error);
        alert('An error occurred while trying to delete the card.');
    }

    renderGameplay();
    setTimeout(() => {
        const addCardButton = document.getElementById('toggle-add-adventure-card-form-btn');
        if (addCardButton) {
            addCardButton.focus();
        } else {
            document.getElementById('adventure-cards-list')?.focus();
        }
    }, 0);
}

export function handleToggleShowAddAdventureCardForm() {
    if (!Rstate.activeAdventure) return;
    const newShowState = !Rstate.showAddAdventureCardForm;
    Rstate.setShowAddAdventureCardForm(newShowState);
    if (newShowState) {
        Rstate.setIsGameplaySidebarVisible(true);
        Rstate.setCurrentGameplaySidebarTab('cards');
        Rstate.setEditingAdventureDetailsCardId(null); 
    }
    renderGameplay();
    setTimeout(() => {
        if (newShowState) {
            document.getElementById('add-adventure-card-type')?.focus();
        } else {
            document.getElementById('toggle-add-adventure-card-form-btn')?.focus();
        }
    }, 0);
}

export async function handleAddCardToAdventureSnapshot() { // Made async
    if (!Rstate.activeAdventure) return;

    const typeInput = document.getElementById('add-adventure-card-type') as HTMLInputElement;
    const nameInput = document.getElementById('add-adventure-card-name') as HTMLInputElement;
    const descriptionInput = document.getElementById('add-adventure-card-description') as HTMLTextAreaElement;
    const keysInput = document.getElementById('add-adventure-card-keys') as HTMLInputElement;

    if (!typeInput || !nameInput || !descriptionInput || !keysInput) {
        console.error("Add card form elements not found in adventure details.");
        return;
    }

    const type = typeInput.value.trim() || 'misc';
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();
    const keys = keysInput.value.trim();

    if (!name) {
        alert("New card name cannot be empty.");
        nameInput.focus();
        return;
    }

    const newCardData: Partial<Card> = {
        type: type,
        name: name,
        description: description,
        keys: keys
    };

    try {
        const response = await fetch(`/api/adventures/${Rstate.activeAdventure.id}/add_card_to_snapshot/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ card: newCardData }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to add card to adventure snapshot:', response.status, errorData);
            alert(`Failed to add card: ${errorData.detail || JSON.stringify(errorData)}`);
        } else {
            const responseData = await response.json();
            console.log("Card added to adventure snapshot successfully.", responseData);

            const newCardWithId: Card = { ...newCardData, id: responseData.card_id || tempId() } as Card;
            Rstate.activeAdventure.scenarioSnapshot.cards.push(newCardWithId);
            Rstate.activeAdventure.lastPlayedAt = Date.now();

            typeInput.value = '';
            nameInput.value = '';
            descriptionInput.value = '';
            keysInput.value = '';
        }

    } catch (error) {
        console.error('Error adding card to adventure snapshot:', error);
        alert('An error occurred while trying to add the card.');
    }

    Rstate.setShowAddAdventureCardForm(false);
    renderGameplay();
    setTimeout(() => {
        const newCardElement = document.querySelector(`.card-item[data-card-id="${Rstate.activeAdventure?.scenarioSnapshot.cards.slice(-1)[0]?.id}"]`);
        newCardElement?.scrollIntoView({ behavior: 'auto', block: 'nearest' });
         (newCardElement?.querySelector('.edit-adventure-card-btn') as HTMLElement)?.focus();
    }, 0);
}

export function handleCancelAddAdventureCardForm() {
    Rstate.setShowAddAdventureCardForm(false);
    renderGameplay();
    setTimeout(() => {
        document.getElementById('toggle-add-adventure-card-form-btn')?.focus();
    }, 0);
}

export async function handleDuplicateAdventureCard(cardId: string) { // Made async
    if (!Rstate.activeAdventure) {
        alert("Cannot duplicate card: No active adventure.");
        return;
    }
    const cardsArrayRef = Rstate.activeAdventure.scenarioSnapshot.cards;
    const originalCardIndex = cardsArrayRef.findIndex(c => c.id === cardId);
    if (originalCardIndex === -1) {
        alert("Error: Card to duplicate not found in adventure.");
        return;
    }
    const originalCard = cardsArrayRef[originalCardIndex];

    try {
        const response = await fetch(`/api/adventures/${Rstate.activeAdventure.id}/duplicate_card_in_snapshot/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ card_id: cardId }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to duplicate adventure card:', response.status, errorData);
            alert(`Failed to duplicate card: ${errorData.detail || JSON.stringify(errorData)}`);
        } else {
            const responseData = await response.json();
            console.log("Adventure card duplicated successfully.", responseData);

            const duplicatedCard: Card = { ...originalCard, id: responseData.new_card_id || tempId() };

            cardsArrayRef.splice(originalCardIndex + 1, 0, duplicatedCard);
            Rstate.activeAdventure.lastPlayedAt = Date.now();
        }

    } catch (error) {
        console.error('Error duplicating adventure card:', error);
        alert('An error occurred while trying to duplicate the card.');
    }

    renderGameplay();
}
