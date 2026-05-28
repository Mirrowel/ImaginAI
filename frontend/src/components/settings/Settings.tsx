import { Link } from "react-router-dom";
import { useMe } from "../../hooks/useAuth";
import { useUiStore } from "../../uiStore";
import { Panel } from "../primitives/Panel";

/**
 * Settings surface: local preferences + utility navigation.
 *
 * Houses gameplay preferences (streaming, thinking, debug, theme)
 * that were previously on the dashboard, plus quick links to
 * Providers, Models, Import, and Admin.
 */
export function Settings() {
  const me = useMe();
  const isAdmin = !!me.data?.user?.isAdmin;
  const {
    textStreamingEnabled, setTextStreamingEnabled,
    streamThinking, setStreamThinking,
    debugPanelsDefaultOpen, setDebugPanelsDefaultOpen,
    showThinkingDefault, setShowThinkingDefault,
    theme, setTheme,
  } = useUiStore();

  return (
    <section className="stack">
      <header className="section-heading">
        <h1>Settings</h1>
      </header>

      {/* Gameplay preferences */}
      <Panel title="Gameplay">
        <div className="stack">
          <div className="settings-checkboxes">
            <label className="checkbox">
              <input
                type="checkbox"
                checked={textStreamingEnabled}
                onChange={(e) => setTextStreamingEnabled(e.target.checked)}
              />
              Text streaming
            </label>
            <span className="muted">Show AI responses as they are generated.</span>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={streamThinking}
                onChange={(e) => setStreamThinking(e.target.checked)}
              />
              Stream thinking
            </label>
            <span className="muted">Display the model's thinking process during generation.</span>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={showThinkingDefault}
                onChange={(e) => setShowThinkingDefault(e.target.checked)}
              />
              Show thinking by default
            </label>
            <span className="muted">Expand thinking panels when opening an adventure.</span>

            <label className="checkbox">
              <input
                type="checkbox"
                checked={debugPanelsDefaultOpen}
                onChange={(e) => setDebugPanelsDefaultOpen(e.target.checked)}
              />
              Debug panels open
            </label>
            <span className="muted">Show adventure state and memory panels by default.</span>
          </div>
        </div>
      </Panel>

      {/* Appearance */}
      <Panel title="Appearance">
        <div className="stack">
          <label>
            Theme
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as "dark" | "system")}
            >
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </label>
        </div>
      </Panel>

      {/* Utility navigation */}
      <Panel title="Configuration">
        <div className="stack">
          <p className="muted">Manage providers, models, and data import.</p>
          <div className="settings-links">
            <Link className="list-item settings-link" to="/providers">
              <strong>Providers</strong>
              <span>API provider connections and credentials</span>
            </Link>
            <Link className="list-item settings-link" to="/models">
              <strong>Models</strong>
              <span>Model configurations, defaults, and parameters</span>
            </Link>
            <Link className="list-item settings-link" to="/import">
              <strong>Import</strong>
              <span>Import AID or native scenario files</span>
            </Link>
            {isAdmin ? (
              <Link className="list-item settings-link" to="/admin">
                <strong>Admin</strong>
                <span>Diagnostics, usage, platform providers and models</span>
              </Link>
            ) : null}
          </div>
        </div>
      </Panel>
    </section>
  );
}
