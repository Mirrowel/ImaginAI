import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMe, useLogout } from "../hooks/useAuth";
import { useUiStore } from "../uiStore";
import { Dashboard } from "../components/browse/Dashboard";
import { ScenarioLibrary } from "../components/browse/ScenarioLibrary";
import { ScenarioEditor } from "../components/edit/ScenarioEditor";
import { ScenarioAdventureList } from "../components/browse/ScenarioAdventureList";
import { ProviderSettings } from "../components/settings/ProviderSettings";
import { ModelSettings } from "../components/settings/ModelSettings";
import { AdminSettings } from "../components/settings/AdminSettings";
import { Settings } from "../components/settings/Settings";
import { ImportFlow } from "../components/import/ImportFlow";

/** Nav item definition for the icon rail. */
interface NavItem {
  to: string;
  icon: string;
  label: string;
  /** Only show when user is admin */
  adminOnly?: boolean;
  /** Hide from mobile tab bar (still in desktop rail) */
  hideOnMobile?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", icon: "I", label: "Home" },
  { to: "/scenarios", icon: "S", label: "Scenarios" },
  { to: "/settings", icon: "\u2699", label: "Settings" },
  { to: "/providers", icon: "P", label: "Providers", hideOnMobile: true },
  { to: "/models", icon: "M", label: "Models", hideOnMobile: true },
  { to: "/admin", icon: "A", label: "Admin", adminOnly: true, hideOnMobile: true },
  { to: "/import", icon: "\u2191", label: "Import", hideOnMobile: true },
];

/**
 * Browse shell: icon nav rail + main content area.
 * Owns the sidebar, renders child routes via <Outlet />.
 * Gameplay route (/adventures/:id) is NOT rendered here; it uses PlayShell.
 *
 * Icon rail is 56px on desktop with single-character glyphs and tooltips.
 * Active route gets amber-gold indicator.
 * Mobile: bottom tab bar below 780px with reduced items (Providers/Models/Admin/Import
 * accessible via Settings).
 */
export function BrowseShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const me = useMe();
  const { sidebarSize } = useUiStore();
  const logoutMutation = useLogout(() => navigate("/login"));
  const isAdmin = !!me.data?.user?.isAdmin;

  function isActive(to: string): boolean {
    if (to === "/") return location.pathname === "/";
    return location.pathname.startsWith(to);
  }

  // Items visible on desktop rail (all non-admin items + admin if admin)
  const desktopItems = NAV_ITEMS.filter((item) => !item.adminOnly || isAdmin);
  // Items visible on mobile tab bar (reduced set: Providers/Models/Admin/Import hidden, accessible via Settings)
  const mobileItems = desktopItems.filter((item) => !item.hideOnMobile);

  return (
    <div className={`app-shell${sidebarSize === "compact" ? " sidebar-compact" : ""}`}>
      {/* Desktop: icon rail */}
      <aside className="nav-rail" role="navigation" aria-label="Main navigation">
        <Link className="nav-rail-brand" to="/" title="ImaginAI" aria-label="ImaginAI home">
          <span aria-hidden="true">I</span>
        </Link>
        <nav className="nav-rail-links">
          {desktopItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`nav-rail-link${isActive(item.to) ? " active" : ""}`}
              title={item.label}
              aria-label={item.label}
              aria-current={isActive(item.to) ? "page" : undefined}
            >
              <span className="nav-rail-icon" aria-hidden="true">{item.icon}</span>
            </Link>
          ))}
        </nav>
        <div className="nav-rail-footer">
          <button
            className="nav-rail-link"
            onClick={() => logoutMutation.mutate()}
            title="Logout"
            aria-label="Logout"
          >
            <span className="nav-rail-icon" aria-hidden="true">&middot;</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-panel">
        <Outlet />
      </main>

      {/* Mobile: bottom tab bar (reduced item set) */}
      <nav className="mobile-tab-bar" role="navigation" aria-label="Main navigation">
        {mobileItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            className={`mobile-tab${isActive(item.to) ? " active" : ""}`}
            aria-label={item.label}
            aria-current={isActive(item.to) ? "page" : undefined}
          >
            <span className="mobile-tab-icon" aria-hidden="true">{item.icon}</span>
            <span className="mobile-tab-label">{item.label}</span>
          </Link>
        ))}
        <button
          type="button"
          className="mobile-tab mobile-tab-button"
          onClick={() => logoutMutation.mutate()}
          aria-label="Logout"
        >
          <span className="mobile-tab-icon" aria-hidden="true">·</span>
          <span className="mobile-tab-label">Logout</span>
        </button>
      </nav>
    </div>
  );
}

/**
 * Individual route elements for BrowseShell child routes.
 * These are used as `element` props in the route config in App.tsx.
 * Exported so App.tsx can reference them without coupling to internals.
 */

export function DashboardRoute() { return <Dashboard />; }
export function ScenarioLibraryRoute() { return <ScenarioLibrary />; }
export function ScenarioEditorRoute() { return <ScenarioEditor />; }
export function ScenarioAdventureListRoute() { return <ScenarioAdventureList />; }
export function ProviderSettingsRoute() { return <ProviderSettings />; }
export function ModelSettingsRoute() { return <ModelSettings />; }
export function AdminSettingsRoute() { return <AdminSettings />; }
export function SettingsRoute() { return <Settings />; }
export function ImportRoute() { return <ImportFlow />; }
