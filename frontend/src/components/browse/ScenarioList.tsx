import { Link } from "react-router-dom";
import type { Scenario } from "../../types";

/** Scenario list shared by dashboard and library screens. */
export function ScenarioList({ scenarios }: { scenarios: Scenario[] }) {
  return (
    <div className="list">
      {scenarios.map((scenario) => <Link key={scenario.id} className="list-item" to={`/scenarios/${scenario.id}`}><strong>{scenario.title}</strong><span>{scenario.description || "No description yet"}</span></Link>)}
      {scenarios.length === 0 ? <p className="muted">No scenarios yet.</p> : null}
    </div>
  );
}
