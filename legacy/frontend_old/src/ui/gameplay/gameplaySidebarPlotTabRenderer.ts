
// src/ui/gameplay/gameplaySidebarPlotTabRenderer.ts
import { escapeHTML } from '../../utils';
import type { ScenarioSnapshot } from '../../types';

export function renderGameplaySidebarPlotTab(scenarioSnapshot: ScenarioSnapshot): string {
  return `
    <div id="gside-panel-plot" role="tabpanel" tabindex="0" aria-labelledby="gside-tab-plot">
        <p class="sidebar-disclaimer"><em>Text fields in 'Plot' are auto-saved when you click away.</em></p>
        <div class="form-group">
            <label for="adventure-instructions">Instructions (System Prompt):</label>
            <div id="adventure-instructions" contenteditable="true" class="editable-text-field" data-fieldkey="instructions" aria-label="Editable Instructions (System Prompt) for this adventure. Changes are saved on blur.">${escapeHTML(scenarioSnapshot.instructions)}</div>
        </div>
        <div class="form-group">
            <label for="adventure-plot-essentials">Plot Essentials:</label>
            <div id="adventure-plot-essentials" contenteditable="true" class="editable-text-field" data-fieldkey="plotEssentials" aria-label="Editable Plot Essentials for this adventure. Changes are saved on blur.">${scenarioSnapshot.plotEssentials ? escapeHTML(scenarioSnapshot.plotEssentials) : ''}</div>
        </div>
        <div class="form-group">
            <label for="adventure-authors-notes">Author's Notes:</label>
            <div id="adventure-authors-notes" contenteditable="true" class="editable-text-field" data-fieldkey="authorsNotes" aria-label="Editable Author's Notes for this adventure. Changes are saved on blur.">${scenarioSnapshot.authorsNotes ? escapeHTML(scenarioSnapshot.authorsNotes) : ''}</div>
        </div>
    </div>
  `;
}
