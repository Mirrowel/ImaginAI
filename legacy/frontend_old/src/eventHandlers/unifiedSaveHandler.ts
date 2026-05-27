
// src/eventHandlers/unifiedSaveHandler.ts
import * as Rstate from '../state';
// REMOVED: handleSaveDefaultScenarioTemplateData
import { handleSaveScenarioData } from './scenarioEventHandlers'; 
import { handleSaveAdventureSettingsData } from './adventureEventHandlers';
import type { Scenario, NewScenarioScaffold, Adventure } from '../types';

export function handleSaveUnifiedEditorData(event: SubmitEvent) {
    event.preventDefault();
    const editorContext = Rstate.currentEditorContext;

    if (!editorContext) {
        console.error("handleSaveUnifiedEditorData called with no currentEditorContext.");
        alert("Error: No data to save.");
        return;
    }

    const formData = new FormData(event.target as HTMLFormElement);

    // REMOVED: Check for isEditingDefaultScenarioTemplate
    if (editorContext.type === 'scenario') {
        handleSaveScenarioData(formData, editorContext.data as Scenario | NewScenarioScaffold);
    } else if (editorContext.type === 'adventure') {
        handleSaveAdventureSettingsData(formData, editorContext.data as Adventure);
    } else {
        console.error("Unknown editor context type in handleSaveUnifiedEditorData:", editorContext);
        alert("Error: Unknown editor type. Cannot save.");
    }
}
