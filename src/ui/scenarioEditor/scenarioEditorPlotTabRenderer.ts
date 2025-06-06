
// src/ui/scenarioEditor/scenarioEditorPlotTabRenderer.ts
import { escapeHTML } from '../../utils';
import type { Scenario, NewScenarioScaffold, ScenarioSnapshot } from '../../types';

export function renderScenarioEditorPlotTab(
    scenarioDataSource: Scenario | NewScenarioScaffold | ScenarioSnapshot,
    editorType: 'scenario' | 'adventure'
): string {
  return `
    <div id="plot-tab-content" role="tabpanel" aria-labelledby="plot-tab-button">
        ${editorType === 'scenario' ? `
            <div class="form-group">
                <label for="scenario-opening">Opening Scene (First AI message for new adventures):</label>
                <textarea id="scenario-opening" name="openingScene" rows="5" required>${escapeHTML(scenarioDataSource.openingScene)}</textarea>
            </div>
        ` : ''}
        <div class="form-group">
            <label for="scenario-instructions">Instructions for AI (System Prompt):</label>
            <textarea id="scenario-instructions" name="instructions" rows="5" required>${escapeHTML(scenarioDataSource.instructions)}</textarea>
        </div>
        <div class="form-group">
            <label for="scenario-plot">Plot Essentials:</label>
            <textarea id="scenario-plot" name="plotEssentials" rows="4">${escapeHTML(scenarioDataSource.plotEssentials)}</textarea>
        </div>
        <div class="form-group">
            <label for="scenario-notes">Author's Notes:</label>
            <textarea id="scenario-notes" name="authorsNotes" rows="4">${escapeHTML(scenarioDataSource.authorsNotes)}</textarea>
        </div>
    </div>
  `;
}
