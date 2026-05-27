// src/eventHandlers/adventureEventHandlers.ts
import * as Rstate from '../state';
import { navigateTo } from '../viewManager';
import type { Adventure, ScenarioSnapshot } from '../types';
import { renderAdventureList } from '../ui/adventureListRenderer';
import { showConfirmationModal } from './modalEventHandlers'; // Import for modal

export async function handleSaveAdventureSettingsData(formData: FormData, adventureDataFromContext: Adventure) { // Made async
    const adventureToUpdate = Rstate.adventures.find(a => a.id === adventureDataFromContext.id);

    if (!adventureToUpdate) {
        alert("Error: Cannot find the adventure to save. Please try again.");
        return;
    }

    // Prepare data to send to the backend
    const updatedData: Partial<Adventure> = {
        adventureName: formData.get('adventureName') as string || adventureToUpdate.adventureName,
        // Include scenarioSnapshot fields that are editable in this form
        scenarioSnapshot: {
            ...adventureToUpdate.scenarioSnapshot, // Keep existing snapshot data
            instructions: formData.get('instructions') as string || adventureToUpdate.scenarioSnapshot.instructions,
            plotEssentials: formData.get('plotEssentials') as string || adventureToUpdate.scenarioSnapshot.plotEssentials,
            authorsNotes: formData.get('authorsNotes') as string || adventureToUpdate.scenarioSnapshot.authorsNotes,
            // Cards are updated via separate handlers and should already be in adventureDataFromContext
            cards: adventureDataFromContext.scenarioSnapshot.cards,
        }
        // lastPlayedAt will be updated by the backend
    };

    try {
        // Assuming the backend endpoint for updating an adventure is /api/adventures/{id}/
        const response = await fetch(`/api/adventures/${adventureToUpdate.id}/`, {
            method: 'PATCH', // Use PATCH for partial update
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to save adventure settings:', response.status, errorData);
            alert(`Failed to save adventure settings: ${errorData.detail || JSON.stringify(errorData)}`);
            return; // Stop if save failed
        }

        const savedAdventure: Adventure = await response.json();

        // Update frontend state with the saved data from the backend
        const index = Rstate.adventures.findIndex(a => a.id === savedAdventure.id);
        if (index !== -1) {
            Rstate.adventures[index] = savedAdventure;
        } else {
             console.warn(`Adventure with ID ${savedAdventure.id} was updated but not found in list. Syncing adventures.`);
             if (Rstate.activeAdventure && Rstate.activeAdventure.id === savedAdventure.id) {
                 Rstate.setActiveAdventure(savedAdventure);
             }
        }

        Rstate.setCurrentEditorContext(null); // Clear editor context

        // If the edited adventure was the active one, navigate back to gameplay
        if (Rstate.activeAdventure && Rstate.activeAdventure.id === savedAdventure.id) {
            navigateTo('gameplay', { adventure: savedAdventure });
        } else {
            navigateTo('adventureList');
        }

    } catch (error) {
        console.error('Error saving adventure settings:', error);
        alert('An error occurred while trying to save the adventure settings.');
    }
}

export async function handleStartNewAdventure(sourceScenarioId: string) { // Made async
    console.log(`handleStartNewAdventure called with sourceScenarioId: ${sourceScenarioId}`);
    const sourceScenario = Rstate.scenarios.find(s => s.id.toString() === sourceScenarioId);
    if (!sourceScenario) {
        alert("Error: Source scenario not found.");
        return;
    }

    try {
        const response = await fetch('/api/adventures/start/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ scenario_id: sourceScenarioId, adventure_name: `Adventure from "${sourceScenario.name}"` }),
        });

        if (!response.ok) {
             const errorData = await response.json();
             console.error('Failed to start new adventure:', response.status, errorData);
             alert(`Failed to start new adventure: ${errorData.detail || JSON.stringify(errorData)}`);
             return;
        }

        const newAdventure: Adventure = await response.json();

        Rstate.adventures.push(newAdventure);

        navigateTo('gameplay', { adventure: newAdventure });

    } catch (error) {
        console.error('Error starting new adventure:', error);
        alert('An error occurred while trying to start a new adventure.');
    }
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
        onConfirm: async () => { // Made async
            try {
                const response = await fetch(`/api/adventures/${adventureId}/`, {
                    method: 'DELETE',
                });

                if (!response.ok) {
                     const errorData = await response.json();
                     console.error('Failed to delete adventure:', response.status, errorData);
                     alert(`Failed to delete adventure: ${errorData.detail || JSON.stringify(errorData)}`);
                     return;
                }

                Rstate.setAdventures(Rstate.adventures.filter(a => a.id !== adventureId));

                if (Rstate.activeAdventure && Rstate.activeAdventure.id === adventureId) {
                    Rstate.setActiveAdventure(null);
                    Rstate.setEditingTurnId(null);
                }

                navigateTo('adventureList');

            } catch (error) {
                console.error('Error deleting adventure:', error);
                alert('An error occurred while trying to delete the adventure.');
            }
        }
    });
}

export async function handleDuplicateAdventure(adventureId: string) { // Made async
    const originalAdventure = Rstate.adventures.find(a => a.id === adventureId);
    if (!originalAdventure) {
        alert("Error: Adventure to duplicate not found.");
        return;
    }

    try {
        // Call the backend duplicate endpoint
        const response = await fetch(`/api/adventures/${adventureId}/duplicate/`, {
            method: 'POST', // Use POST for actions
            headers: {
                'Content-Type': 'application/json',
                // Include CSRF token if necessary
                // 'X-CSRFToken': getCookie('csrftoken'),
            },
            // No body needed for this specific duplicate action based on backend implementation
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Failed to duplicate adventure:', response.status, errorData);
            alert(`Failed to duplicate adventure: ${errorData.detail || JSON.stringify(errorData)}`);
            return; // Stop if duplication failed
        }

        const duplicatedAdventure: Adventure = await response.json();

        // Add the newly duplicated adventure to the frontend state
        Rstate.adventures.push(duplicatedAdventure);

        alert(`Adventure "${originalAdventure.adventureName}" duplicated as "${duplicatedAdventure.adventureName}".`);
        renderAdventureList(); // Re-render the adventure list

    } catch (error) {
        console.error('Error duplicating adventure:', error);
        alert('An error occurred while trying to duplicate the adventure.');
    }
}

export async function handleAdventureDetailBlur( // Made async
    fieldKey: keyof Pick<ScenarioSnapshot, 'instructions' | 'plotEssentials' | 'authorsNotes'>,
    targetElement: HTMLDivElement
) {
    if (!Rstate.activeAdventure) return;
    const newValue = targetElement.innerText;

    if (Rstate.activeAdventure.scenarioSnapshot[fieldKey] !== newValue) {
        Rstate.activeAdventure.scenarioSnapshot[fieldKey] = newValue;
        Rstate.activeAdventure.lastPlayedAt = Date.now();
        console.log(`Adventure detail '${fieldKey}' updated in frontend state.`);

        const updateData: Partial<Adventure> = {
             scenarioSnapshot: {
                 ...Rstate.activeAdventure.scenarioSnapshot,
                 [fieldKey]: newValue,
             }
        };

        try {
            const response = await fetch(`/api/adventures/${Rstate.activeAdventure.id}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updateData),
            });

            if (!response.ok) {
                 const errorData = await response.json();
                 console.error(`Failed to auto-save adventure detail '${fieldKey}':`, response.status, errorData);
                 alert(`Failed to auto-save changes: ${errorData.detail || JSON.stringify(errorData)}`);
            } else {
                 const savedAdventure: Adventure = await response.json();
                 const index = Rstate.adventures.findIndex(a => a.id === savedAdventure.id);
                 if (index !== -1) {
                     Rstate.adventures[index] = savedAdventure;
                 }
                 if (Rstate.activeAdventure && Rstate.activeAdventure.id === savedAdventure.id) {
                     Rstate.setActiveAdventure(savedAdventure);
                 }
                 console.log(`Adventure detail '${fieldKey}' auto-saved successfully.`);
            }

        } catch (error) {
            console.error(`Error auto-saving adventure detail '${fieldKey}':`, error);
            alert('An error occurred while trying to auto-save changes.');
        }
    }
}
