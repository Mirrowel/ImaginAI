
// src/ui/gameplay/gameplayHeaderRenderer.ts
import { escapeHTML } from '../../utils';

export function renderGameplayHeader(adventureName: string, isSidebarVisible: boolean): string {
  return `
    <div class="gameplay-header">
      <button id="exit-game-btn" class="secondary">Exit to Adventures</button>
      <h2 id="gameplay-heading" tabindex="-1">${escapeHTML(adventureName)}</h2>
      <button id="sidebar-toggle-btn" class="sidebar-toggle-button ${isSidebarVisible ? 'active' : ''}" aria-label="Toggle adventure details sidebar" aria-expanded="${isSidebarVisible}" aria-controls="gameplay-sidebar-content">☰</button>
    </div>
  `;
}
