
// src/ui/gameplay/gameplaySidebarInfoTabRenderer.ts
import { escapeHTML } from '../../utils';
import type { Adventure } from '../../types';

export function renderGameplaySidebarInfoTab(adventure: Adventure): string {
  const { adventureName, sourceScenarioName, scenarioSnapshot } = adventure;
  return `
    <div id="gside-panel-info" role="tabpanel" tabindex="0" aria-labelledby="gside-tab-info">
        <div class="info-field">
            <strong>Adventure Name:</strong>
            <p>${escapeHTML(adventureName)}</p>
        </div>
        <div class="info-field">
            <strong>Source Scenario:</strong>
            <p>${escapeHTML(sourceScenarioName)}</p>
        </div>
        <div class="info-field">
            <strong>Player Description:</strong>
            <p>${scenarioSnapshot.playerDescription ? escapeHTML(scenarioSnapshot.playerDescription) : '<em>No player description provided.</em>'}</p>
        </div>
        <div class="info-field">
            <strong>Tags:</strong>
            <p>${scenarioSnapshot.tags ? escapeHTML(scenarioSnapshot.tags) : '<em>No tags.</em>'}</p>
        </div>
        <div class="info-field">
            <strong>Visibility:</strong>
            <p>${escapeHTML(scenarioSnapshot.visibility.charAt(0).toUpperCase() + scenarioSnapshot.visibility.slice(1))}</p>
        </div>
    </div>
  `;
}
