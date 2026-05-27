
// src/ui/gameplay/index.ts
export { renderGameplay } from './gameplayMainRenderer';
// Exporting sub-renderers isn't strictly necessary if only gameplayMainRenderer uses them,
// but can be useful for organization or future direct use.
export { renderGameplayHeader } from './gameplayHeaderRenderer';
export { renderGameplayHistoryLog } from './gameplayHistoryRenderer';
export { renderGameplayActionArea } from './gameplayActionAreaRenderer';
export { renderGameplaySidebar, attachGameplaySidebarEventListeners } from './gameplaySidebarRenderer';
export { renderGameplaySidebarPlotTab } from './gameplaySidebarPlotTabRenderer';
export { renderGameplaySidebarCardsTab } from './gameplaySidebarCardsTabRenderer';
export { renderGameplaySidebarInfoTab } from './gameplaySidebarInfoTabRenderer';
// Removed: export { renderGameplaySidebarStatsTab } from './gameplaySidebarStatsTabRenderer';
