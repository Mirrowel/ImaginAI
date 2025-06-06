
// src/eventHandlers/scenarioEventHandlers.ts
import * as Rstate from '../state';
import { generateId } from '../utils';
import { saveScenariosToStorage } from '../storage'; // Removed saveDefaultScenarioTemplate
import { navigateTo, renderApp } from '../viewManager';
import type { Scenario, NewScenarioScaffold, Card } from '../types';
import { renderScenarioList } from '../ui/scenarioListRenderer';
import { showConfirmationModal } from './modalEventHandlers'; // Import for modal

// REMOVED: handleSaveDefaultScenarioTemplateData

export function handleSaveScenarioData(formData: FormData, scenarioBeingEdited: Scenario | NewScenarioScaffold) {
    // Cards are sourced from the context if available, scenarioBeingEdited might be stale for cards
     const currentCards = (Rstate.currentEditorContext?.type === 'scenario') 
        ? Rstate.currentEditorContext.data.cards 
        : scenarioBeingEdited.cards;


    const scenarioToSave: Scenario = {
        id: ('id' in scenarioBeingEdited && scenarioBeingEdited.id) ? scenarioBeingEdited.id : generateId(),
        name: formData.get('name') as string || 'Untitled Scenario',
        instructions: formData.get('instructions') as string || '',
        plotEssentials: formData.get('plotEssentials') as string || '',
        authorsNotes: formData.get('authorsNotes') as string || '',
        openingScene: formData.get('openingScene') as string || 'The story begins...',
        cards: currentCards.map(c => ({ ...c, keys: c.keys || "" })),
        playerDescription: formData.get('playerDescription') as string || ('playerDescription' in scenarioBeingEdited ? scenarioBeingEdited.playerDescription : ""),
        tags: formData.get('tags') as string || ('tags' in scenarioBeingEdited ? scenarioBeingEdited.tags : ""),
        visibility: formData.get('visibility') as Scenario['visibility'] || ('visibility' in scenarioBeingEdited ? scenarioBeingEdited.visibility : "private"),
    };

    if ('id' in scenarioBeingEdited && scenarioBeingEdited.id) { // Existing scenario
        const index = Rstate.scenarios.findIndex(s => s.id === scenarioBeingEdited.id);
        if (index !== -1) {
            Rstate.scenarios[index] = scenarioToSave;
        } else {
            // This case (ID exists but not in list) should be rare. Add it as a new one.
            console.warn(`Scenario with ID ${scenarioBeingEdited.id} was being edited but not found in list. Adding as new.`);
            Rstate.scenarios.push(scenarioToSave); 
        }
    } else { // New scenario
        Rstate.scenarios.push(scenarioToSave);
    }
    saveScenariosToStorage();
    Rstate.setCurrentEditorContext(null);
    Rstate.setEditingScenarioEditorCardId(null);
    Rstate.setShowAddScenarioCardForm(false);
    navigateTo('scenarioList');
}

export function handleDeleteScenario(scenarioId: string) {
    const scenarioIndex = Rstate.scenarios.findIndex(s => s.id === scenarioId);
    const scenarioName = scenarioIndex !== -1 ? Rstate.scenarios[scenarioIndex].name : "this scenario";

    showConfirmationModal({
        title: "Delete Scenario Template",
        message: `Are you sure you want to delete the scenario template "${Rstate.scenarios[scenarioIndex]?.name || scenarioId}"? This action cannot be undone and will not delete adventures already started from it.`,
        confirmText: "Delete Template",
        onConfirm: () => {
            if (scenarioIndex === -1) {
                console.warn("Scenario to delete not found:", scenarioId);
                return;
            }
            Rstate.scenarios.splice(scenarioIndex, 1);
            saveScenariosToStorage();
            if (Rstate.currentEditorContext?.type === 'scenario' && 'id' in Rstate.currentEditorContext.data && Rstate.currentEditorContext.data.id === scenarioId) {
                Rstate.setCurrentEditorContext(null);
                navigateTo('scenarioList');
            } else {
                renderApp(); // Re-render current view (scenarioList)
            }
        }
    });
}

export function handleDuplicateScenario(scenarioId: string) {
    const originalScenario = Rstate.scenarios.find(s => s.id === scenarioId);
    if (!originalScenario) {
        alert("Error: Scenario to duplicate not found.");
        return;
    }

    const newScenario: Scenario = JSON.parse(JSON.stringify(originalScenario)); // Deep copy
    newScenario.id = generateId();
    newScenario.name = `${originalScenario.name} (Copy)`;
    newScenario.cards = newScenario.cards.map(card => ({ ...card, id: generateId(), keys: card.keys || "" }));
    // Ensure all fields from Scenario type are copied or initialized
    newScenario.playerDescription = originalScenario.playerDescription || "";
    newScenario.tags = originalScenario.tags || "";
    newScenario.visibility = originalScenario.visibility || 'private';


    Rstate.scenarios.push(newScenario);
    saveScenariosToStorage();
    renderScenarioList(); 
    alert(`Scenario "${originalScenario.name}" duplicated as "${newScenario.name}".`);
}

// --- Scenario Import/Export Handlers ---

export function handleExportScenario(scenarioId: string) {
    const scenarioToExport = Rstate.scenarios.find(s => s.id === scenarioId);
    if (!scenarioToExport) {
        alert("Error: Scenario to export not found.");
        return;
    }

    // Create a clean copy for export, ensuring all fields are present
    const cleanedScenario: Scenario = {
        id: scenarioToExport.id, // Keep original ID for export context, new ID on import
        name: scenarioToExport.name || "Untitled Exported Scenario",
        instructions: scenarioToExport.instructions || "",
        plotEssentials: scenarioToExport.plotEssentials || "",
        authorsNotes: scenarioToExport.authorsNotes || "",
        openingScene: scenarioToExport.openingScene || "The story begins...",
        cards: scenarioToExport.cards.map(card => ({
            id: card.id, // Keep original card ID for export
            type: card.type || "misc",
            name: card.name || "Unnamed Card",
            description: card.description || "",
            keys: card.keys || ""
        })),
        playerDescription: scenarioToExport.playerDescription || "",
        tags: scenarioToExport.tags || "",
        visibility: scenarioToExport.visibility || 'private'
    };

    const jsonData = JSON.stringify(cleanedScenario, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${cleanedScenario.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_scenario.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function handleImportScenarioTrigger() {
    const fileInput = document.getElementById('import-scenario-file-input') as HTMLInputElement;
    fileInput?.click();
}

function isValidScenarioImportData(data: any): data is Partial<Scenario> {
    if (typeof data !== 'object' || data === null) return false;
    // Basic check for some expected top-level scenario properties
    return (
        typeof data.name === 'string' &&
        typeof data.instructions === 'string' &&
        typeof data.openingScene === 'string' &&
        (Array.isArray(data.cards) || data.cards === undefined)
    );
}

export function handleImportScenarioFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
        try {
            const content = e.target?.result as string;
            const parsedData = JSON.parse(content);

            if (!isValidScenarioImportData(parsedData)) {
                alert("Invalid scenario data format. The file does not seem to be a valid scenario export.");
                return;
            }

            const importedScenario: Scenario = {
                id: generateId(), // Assign a NEW unique ID to the imported scenario
                name: parsedData.name || 'Imported Scenario',
                instructions: parsedData.instructions || '',
                plotEssentials: parsedData.plotEssentials || '',
                authorsNotes: parsedData.authorsNotes || '',
                openingScene: parsedData.openingScene || 'The story begins...',
                cards: (parsedData.cards || []).map((rawCard: any) => ({
                    id: generateId(), // Assign a NEW unique ID to each imported card
                    type: rawCard.type || 'misc',
                    name: rawCard.name || 'Unnamed Card',
                    description: rawCard.description || '',
                    keys: typeof rawCard.keys === 'string' ? rawCard.keys : ''
                })),
                playerDescription: parsedData.playerDescription || "",
                tags: parsedData.tags || "",
                visibility: parsedData.visibility || 'private'
            };

            Rstate.scenarios.push(importedScenario);
            saveScenariosToStorage();
            alert(`Scenario "${importedScenario.name}" imported successfully.`);
            renderApp(); // Re-render the scenario list

        } catch (error) {
            console.error("Error importing scenario:", error);
            alert("Failed to import scenario. The file might be corrupted or not in the expected JSON format.");
        } finally {
            input.value = ''; // Reset file input
        }
    };
    reader.onerror = () => { 
        alert("Error reading the scenario file."); 
        input.value = ''; 
    };
    reader.readAsText(file);
}
