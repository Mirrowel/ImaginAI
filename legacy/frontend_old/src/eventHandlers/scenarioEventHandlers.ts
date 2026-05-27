// src/eventHandlers/scenarioEventHandlers.ts
import * as Rstate from '../state';
import { deleteScenario, duplicateScenario, exportScenario } from '../apiService';
// import { saveScenariosToStorage } from '../storage'; // Removed local storage import
import { navigateTo, renderApp } from '../viewManager';
import type { Scenario, NewScenarioScaffold } from '../types';
import { renderScenarioList } from '../ui/scenarioListRenderer';
import { showConfirmationModal } from './modalEventHandlers'; // Import for modal

// REMOVED: handleSaveDefaultScenarioTemplateData

export async function handleSaveScenarioData(formData: FormData, scenarioBeingEdited: Scenario | NewScenarioScaffold) { // Made async
    // Cards are sourced from the context if available, scenarioBeingEdited might be stale for cards
     const currentCards = (Rstate.currentEditorContext?.type === 'scenario')
        ? Rstate.currentEditorContext.data.cards
        : scenarioBeingEdited.cards;

    const scenarioData: Partial<Scenario> = {
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

    const isExistingScenario = ('id' in scenarioBeingEdited && scenarioBeingEdited.id);
    const url = isExistingScenario ? `/api/scenarios/${scenarioBeingEdited.id}/` : '/api/scenarios/';
    const method = isExistingScenario ? 'PUT' : 'POST'; // Use PUT for update, POST for create

    try {
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                // Include CSRF token if necessary
                // 'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify(scenarioData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to save scenario:', response.status, errorData);
            alert(`Failed to save scenario: ${errorData.detail || JSON.stringify(errorData)}`);
            return; // Stop if save failed
        }

        const savedScenario: Scenario = await response.json();

        // Update frontend state after successful backend save
        if (isExistingScenario) {
            const index = Rstate.scenarios.findIndex(s => s.id === savedScenario.id);
            if (index !== -1) {
                Rstate.scenarios[index] = savedScenario;
            } else {
                 // This case (ID exists but not in list) should be rare. Fetch all scenarios to sync.
                 console.warn(`Scenario with ID ${savedScenario.id} was updated but not found in list. Syncing scenarios.`);
                 // TODO: Implement fetchScenariosFromBackend and call it here
                 // For now, just add it if not found (less ideal but prevents data loss in frontend)
                 Rstate.scenarios.push(savedScenario);
            }
        } else { // New scenario
            Rstate.scenarios.push(savedScenario);
        }

        // saveScenariosToStorage(); // Remove local storage save
        Rstate.setCurrentEditorContext(null);
        Rstate.setEditingScenarioEditorCardId(null);
        Rstate.setShowAddScenarioCardForm(false);
        navigateTo('scenarioList');

    } catch (error) {
        console.error('Error saving scenario:', error);
        alert('An error occurred while trying to save the scenario.');
    }
}

export function handleDeleteScenario(scenarioId: string) {
    console.log(`handleDeleteScenario called with scenarioId: ${scenarioId}`);
    const idAsNumber = parseInt(scenarioId, 10);
    const scenarioIndex = Rstate.scenarios.findIndex(s => s.id === idAsNumber);
    const scenarioName = scenarioIndex !== -1 ? Rstate.scenarios[scenarioIndex].name : "this scenario";

    showConfirmationModal({
        title: "Delete Scenario Template",
        message: `Are you sure you want to delete the scenario template "${Rstate.scenarios[scenarioIndex]?.name || scenarioId}"? This action cannot be undone and will not delete adventures already started from it.`,
        confirmText: "Delete Template",
        onConfirm: async () => { // Made async
            console.log(`Confirmed deletion for scenarioId: ${scenarioId}`);
            if (scenarioIndex === -1) {
                console.warn("Scenario to delete not found:", scenarioId);
                return;
            }

            try {
                await deleteScenario(scenarioId);
                console.log(`Successfully deleted scenario with id: ${scenarioId}`);

                // Remove from frontend state only after successful backend delete
                Rstate.scenarios.splice(scenarioIndex, 1);
                // saveScenariosToStorage(); // Remove local storage save

                if (Rstate.currentEditorContext?.type === 'scenario' && 'id' in Rstate.currentEditorContext.data && Rstate.currentEditorContext.data.id.toString() === scenarioId) {
                    Rstate.setCurrentEditorContext(null);
                    navigateTo('scenarioList');
                } else {
                    renderApp(); // Re-render current view (scenarioList)
                }

            } catch (error) {
                console.error('Error deleting scenario:', error);
                alert('An error occurred while trying to delete the scenario.');
            }
        }
    });
}

export async function handleDuplicateScenario(scenarioId: string) { // Made async
    console.log(`handleDuplicateScenario called with scenarioId: ${scenarioId}`);
    const idAsNumber = parseInt(scenarioId, 10);
    const originalScenario = Rstate.scenarios.find(s => s.id === idAsNumber);
    if (!originalScenario) {
        alert("Error: Scenario to duplicate not found.");
        return;
    }

    try {
        const duplicatedScenario = await duplicateScenario(scenarioId);
        console.log(`Successfully duplicated scenario with id: ${scenarioId}`, duplicatedScenario);

        // Add the newly duplicated scenario to the frontend state
        Rstate.scenarios.push(duplicatedScenario);
        // saveScenariosToStorage(); // Remove local storage save

        alert(`Scenario "${originalScenario.name}" duplicated as "${duplicatedScenario.name}".`);
        renderScenarioList(); // Re-render the scenario list

    } catch (error) {
        console.error('Error duplicating scenario:', error);
        alert('An error occurred while trying to duplicate the scenario.');
    }
}

// --- Scenario Import/Export Handlers ---

export async function handleExportScenario(scenarioId: string) { // Made async
    console.log(`handleExportScenario called with scenarioId: ${scenarioId}`);
    const idAsNumber = parseInt(scenarioId, 10);
    const scenarioToExport = Rstate.scenarios.find(s => s.id === idAsNumber);
    if (!scenarioToExport) {
        alert("Error: Scenario to export not found.");
        return;
    }

    try {
        const scenarioData = await exportScenario(scenarioId);
        console.log(`Successfully exported scenario with id: ${scenarioId}`, scenarioData);

        // Create a clean copy for export, ensuring all fields are present
        const cleanedScenario: Scenario = {
            id: scenarioData.id, // Keep original ID for export context, new ID on import
            name: scenarioData.name || "Untitled Exported Scenario",
            instructions: scenarioData.instructions || "",
            plotEssentials: scenarioData.plotEssentials || "",
            authorsNotes: scenarioData.authorsNotes || "",
            openingScene: scenarioData.openingScene || "The story begins...",
            cards: (scenarioData.cards || []).map((rawCard: any) => ({
                id: rawCard.id, // Keep original card ID for export
                type: rawCard.type || "misc",
                name: rawCard.name || "Unnamed Card",
                description: rawCard.description || "",
                keys: typeof rawCard.keys === 'string' ? rawCard.keys : ''
            })),
            playerDescription: scenarioData.playerDescription || "",
            tags: scenarioData.tags || "",
            visibility: scenarioData.visibility || 'private'
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

    } catch (error) {
        console.error('Error exporting scenario:', error);
        alert('An error occurred while trying to export the scenario.');
    }
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

export async function handleImportScenarioFileSelected(event: Event) { // Made async
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const reader = new FileReader();

    reader.onload = async (e) => { // Made async
        try {
            const content = e.target?.result as string;
            const parsedData = JSON.parse(content);

            if (!isValidScenarioImportData(parsedData)) {
                alert("Invalid scenario data format. The file does not seem to be a valid scenario export.");
                return;
            }

            // Assuming the backend endpoint for importing a scenario is /api/scenarios/import_scenario/
            const response = await fetch('/api/scenarios/import_scenario/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Include CSRF token if necessary
                    // 'X-CSRFToken': getCookie('csrftoken'),
                },
                body: JSON.stringify(parsedData), // Send the parsed data directly
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 console.error('Failed to import scenario:', response.status, errorData);
                 alert(`Failed to import scenario: ${errorData.detail || JSON.stringify(errorData)}`);
                 return; // Stop if import failed
            }

            const importedScenario: Scenario = await response.json();

            // Add the newly imported scenario to the frontend state
            Rstate.scenarios.push(importedScenario);
            // saveScenariosToStorage(); // Remove local storage save

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
