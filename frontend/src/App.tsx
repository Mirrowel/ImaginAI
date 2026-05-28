import { Routes, Route } from "react-router-dom";
import { AuthShell } from "./shells/AuthShell";
import { BrowseShell, DashboardRoute, ScenarioLibraryRoute, ScenarioEditorRoute, ScenarioAdventureListRoute, ProviderSettingsRoute, ModelSettingsRoute, AdminSettingsRoute, SettingsRoute, ImportRoute } from "./shells/BrowseShell";
import { PlayShell } from "./shells/PlayShell";
import { RequireAuth } from "./shells/RequireAuth";
import { Gameplay } from "./components/play/Gameplay";

/**
 * Top-level route definitions using layout routes.
 *
 * Auth route: /login renders AuthShell (standalone).
 * All other routes: RequireAuth guard wrapping two peer shell layouts.
 *   BrowseShell: sidebar + outlet for browse/edit/settings routes.
 *   PlayShell: header-only + outlet for gameplay routes.
 * PlayShell is a PEER of BrowseShell, never nested inside it.
 */
export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthShell />} />
      <Route element={<RequireAuth />}>
        <Route element={<BrowseShell />}>
          <Route path="/" element={<DashboardRoute />} />
          <Route path="/scenarios" element={<ScenarioLibraryRoute />} />
          <Route path="/scenarios/:scenarioId" element={<ScenarioEditorRoute />} />
          <Route path="/scenarios/:scenarioId/adventures" element={<ScenarioAdventureListRoute />} />
          <Route path="/providers" element={<ProviderSettingsRoute />} />
          <Route path="/models" element={<ModelSettingsRoute />} />
          <Route path="/settings" element={<SettingsRoute />} />
          <Route path="/admin" element={<AdminSettingsRoute />} />
          <Route path="/import" element={<ImportRoute />} />
        </Route>
        <Route element={<PlayShell />}>
          <Route path="/adventures/:adventureId" element={<Gameplay />} />
        </Route>
      </Route>
    </Routes>
  );
}
