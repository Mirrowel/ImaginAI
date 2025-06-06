
// src/ui/scenarioEditor/scenarioEditorDetailsTabRenderer.ts
import { escapeHTML } from '../../utils';
import type { Scenario, NewScenarioScaffold, ScenarioSnapshot, Adventure } from '../../types';

export function renderScenarioEditorDetailsTab(
    scenarioDataSource: Scenario | NewScenarioScaffold | ScenarioSnapshot,
    editorType: 'scenario' | 'adventure',
    adventureDataForEditor: Adventure | null // Only relevant if editorType is 'adventure'
): string {
  return `
    <div id="details-tab-content" role="tabpanel" aria-labelledby="details-tab-button">
        ${editorType === 'adventure' && adventureDataForEditor ? `
            <div class="form-group">
                <label for="adventure-name">Adventure Name:</label>
                <input type="text" id="adventure-name" name="adventureName" value="${escapeHTML(adventureDataForEditor.adventureName)}" required>
            </div>
            <div class="form-group">
                <label>Source Scenario:</label>
                <p style="background-color: var(--surface-color); padding: 0.8rem; border-radius: var(--border-radius); border: 1px solid var(--border-color);">${escapeHTML(adventureDataForEditor.sourceScenarioName)}</p>
            </div>
        ` : `
            <div class="form-group">
                <label for="scenario-name">Scenario Name:</label>
                <input type="text" id="scenario-name" name="name" value="${escapeHTML(scenarioDataSource.name)}" required>
            </div>
            <div class="form-group">
                <label for="scenario-player-description">Description for Players (shown before starting an adventure):</label>
                <textarea id="scenario-player-description" name="playerDescription" rows="3">${escapeHTML((scenarioDataSource as Scenario).playerDescription || '')}</textarea>
            </div>
            <div class="form-group">
                <label for="scenario-tags">Tags (comma-separated, for discovery - e.g., fantasy, sci-fi, mystery):</label>
                <input type="text" id="scenario-tags" name="tags" value="${escapeHTML((scenarioDataSource as Scenario).tags || '')}">
            </div>
            <div class="form-group">
                <label for="scenario-visibility">Visibility:</label>
                <select id="scenario-visibility" name="visibility">
                    <option value="private" ${ (scenarioDataSource as Scenario).visibility === 'private' ? 'selected' : ''}>Private (Only you)</option>
                    <option value="unlisted" ${ (scenarioDataSource as Scenario).visibility === 'unlisted' ? 'selected' : ''}>Unlisted (Anyone with the link)</option>
                    <option value="public" ${ (scenarioDataSource as Scenario).visibility === 'public' ? 'selected' : ''}>Public (Discoverable by others)</option>
                </select>
            </div>
        `}
    </div>
  `;
}
