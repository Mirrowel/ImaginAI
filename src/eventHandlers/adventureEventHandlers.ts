
// src/eventHandlers/adventureEventHandlers.ts
import * as Rstate from '../state';
import { generateId } from '../utils';
import { saveAdventuresToStorage } from '../storage';
import { navigateTo } from '../viewManager';
import type { Adventure, ScenarioSnapshot } from '../types';
import { renderAdventureList } from '../ui/adventureListRenderer';
import { showConfirmationModal } from './modalEventHandlers'; // Import for modal

export function handleSaveAdventureSettingsData(formData: FormData, adventureDataFromContext: Adventure) {
    const adventureToUpdate = Rstate.adventures.find(a => a.id === adventureDataFromContext.id);

    if (!adventureToUpdate) {
        alert("Error: Cannot find the adventure to save. Please try again.");
        return;
    }
    
    adventureToUpdate.adventureName = formData.get('adventureName') as string || adventureToUpdate.adventureName;
    // Fields from the 'Plot' tab in the editor (which are part of scenarioSnapshot)
    adventureToUpdate.scenarioSnapshot.instructions = formData.get('instructions') as string || adventureToUpdate.scenarioSnapshot.instructions;
    adventureToUpdate.scenarioSnapshot.plotEssentials = formData.get('plotEssentials') as string || adventureToUpdate.scenarioSnapshot.plotEssentials;
    adventureToUpdate.scenarioSnapshot.authorsNotes = formData.get('authorsNotes') as string || adventureToUpdate.scenarioSnapshot.authorsNotes;
    
    // Cards are managed by cardEventHandlers and updated directly in Rstate.currentEditorContext.data.scenarioSnapshot.cards
    // So, we ensure the latest cards from the context are saved.
    adventureToUpdate.scenarioSnapshot.cards = adventureDataFromContext.scenarioSnapshot.cards;

    // Details tab fields (if they were editable for an adventure, they'd be here)
    // For now, these are primarily for Scenario, but we ensure snapshot is preserved
    adventureToUpdate.scenarioSnapshot.playerDescription = adventureDataFromContext.scenarioSnapshot.playerDescription;
    adventureToUpdate.scenarioSnapshot.tags = adventureDataFromContext.scenarioSnapshot.tags;
    adventureToUpdate.scenarioSnapshot.visibility = adventureDataFromContext.scenarioSnapshot.visibility;

    adventureToUpdate.lastPlayedAt = Date.now();
    saveAdventuresToStorage();
    Rstate.setCurrentEditorContext(null); // Clear editor context
    
    // If the edited adventure was the active one, navigate back to gameplay
    if (Rstate.activeAdventure && Rstate.activeAdventure.id === adventureToUpdate.id) {
        navigateTo('gameplay', { adventure: adventureToUpdate });
    } else {
        // Otherwise, if edited from adventure list (e.g. future feature), go back to list
        navigateTo('adventureList');
    }
}

export function handleStartNewAdventure(sourceScenarioId: string) {
    const sourceScenario = Rstate.scenarios.find(s => s.id === sourceScenarioId);
    if (!sourceScenario) {
        alert("Error: Source scenario not found.");
        return;
    }

    const scenarioSnapshot: ScenarioSnapshot = {
        name: sourceScenario.name,
        instructions: sourceScenario.instructions,
        plotEssentials: sourceScenario.plotEssentials,
        authorsNotes: sourceScenario.authorsNotes,
        openingScene: sourceScenario.openingScene,
        cards: JSON.parse(JSON.stringify(sourceScenario.cards.map(c => ({...c, keys: c.keys || ""})))), 
        playerDescription: sourceScenario.playerDescription,
        tags: sourceScenario.tags,
        visibility: sourceScenario.visibility,
    };

    const now = Date.now();
    const newAdventure: Adventure = {
        id: generateId(),
        sourceScenarioId: sourceScenario.id,
        sourceScenarioName: sourceScenario.name,
        adventureName: `Adventure from "${sourceScenario.name}"`, 
        scenarioSnapshot,
        adventureHistory: [], 
        createdAt: now,
        lastPlayedAt: now,
    };

    Rstate.adventures.push(newAdventure);
    saveAdventuresToStorage();
    navigateTo('gameplay', { adventure: newAdventure });
}

export function handleDeleteAdventure(adventureId: string) {
    if (!adventureId) {
        console.error("handleDeleteAdventure: adventureId is undefined or null.");
        return;
    }
    
    const adventure = Rstate.adventures.find(a => a.id === adventureId);
    const adventureName = adventure ? adventure.adventureName : "this adventure";

    showConfirmationModal({
        title: "Delete Adventure",
        message: `Are you sure you want to delete the adventure "${adventureName}"? This action cannot be undone.`,
        confirmText: "Delete Adventure",
        onConfirm: () => {
            Rstate.setAdventures(Rstate.adventures.filter(a => a.id !== adventureId));
            saveAdventuresToStorage();

            if (Rstate.activeAdventure && Rstate.activeAdventure.id === adventureId) {
                Rstate.setActiveAdventure(null);
                Rstate.setEditingTurnId(null);
            }
            
            navigateTo('adventureList'); 
        }
    });
}

export function handleDuplicateAdventure(adventureId: string) {
    const originalAdventure = Rstate.adventures.find(a => a.id === adventureId);
    if (!originalAdventure) {
        alert("Error: Adventure to duplicate not found.");
        return;
    }

    const newAdventure: Adventure = JSON.parse(JSON.stringify(originalAdventure)); // Deep copy
    newAdventure.id = generateId();
    newAdventure.adventureName = `${originalAdventure.adventureName} (Copy)`;
    const now = Date.now();
    newAdventure.createdAt = now;
    newAdventure.lastPlayedAt = now;

    newAdventure.scenarioSnapshot.cards = newAdventure.scenarioSnapshot.cards.map(card => ({
        ...card,
        id: generateId(),
        keys: card.keys || ""
    }));
    newAdventure.scenarioSnapshot.playerDescription = originalAdventure.scenarioSnapshot.playerDescription;
    newAdventure.scenarioSnapshot.tags = originalAdventure.scenarioSnapshot.tags;
    newAdventure.scenarioSnapshot.visibility = originalAdventure.scenarioSnapshot.visibility;

    newAdventure.adventureHistory = newAdventure.adventureHistory.map(turn => ({
        ...turn,
        id: generateId()
    }));

    Rstate.adventures.push(newAdventure);
    saveAdventuresToStorage();
    renderAdventureList(); 
    alert(`Adventure "${originalAdventure.adventureName}" duplicated as "${newAdventure.adventureName}".`);
}

export function handleAdventureDetailBlur(
    fieldKey: keyof Pick<ScenarioSnapshot, 'instructions' | 'plotEssentials' | 'authorsNotes'>, 
    targetElement: HTMLDivElement
) {
    if (!Rstate.activeAdventure) return;
    const newValue = targetElement.innerText; 
    
    if (Rstate.activeAdventure.scenarioSnapshot[fieldKey] !== newValue) {
        Rstate.activeAdventure.scenarioSnapshot[fieldKey] = newValue;
        Rstate.activeAdventure.lastPlayedAt = Date.now();
        saveAdventuresToStorage();
        console.log(`Adventure detail '${fieldKey}' auto-saved.`);
    }
}
