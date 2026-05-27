// src/storage.ts
import * as state from './state';
import * as api from './apiService';
import type { Scenario, Adventure } from './types';

export async function loadScenariosFromAPI() {
    try {
        const scenariosData = await api.getScenarios();
        // The backend should return data in the correct shape, so minimal processing is needed.
        state.setScenarios(scenariosData);
    } catch (e) {
        console.error("Error loading scenarios from API:", e);
        state.setScenarios([]); // Set to empty on error
    }
}

export async function loadAdventuresFromAPI() {
    try {
        const adventuresData = await api.getAdventures();
        // The backend should return data in the correct shape.
        state.setAdventures(adventuresData);
    } catch (e) {
        console.error("Error loading adventures from API:", e);
        state.setAdventures([]);
    }
}

export async function saveAdventureToAPI(adventure: Adventure): Promise<void> {
    try {
        await api.updateAdventure(adventure.id, adventure);
    } catch (e) {
        console.error("Error saving adventure to API:", e);
    }
}

export async function saveScenarioToAPI(scenario: Scenario): Promise<void> {
    try {
        await api.updateScenario(scenario.id, scenario);
    } catch (e) {
        console.error("Error saving scenario to API:", e);
    }
}
