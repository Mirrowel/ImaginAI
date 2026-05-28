import { Link } from "react-router-dom";
import type { Scenario } from "../../types";
import { SkeletonList } from "../primitives/LoadingStates";
import { EmptyState } from "../primitives/LoadingStates";

/** Scenario list shared by dashboard and library screens. */
export function ScenarioList({ scenarios, isLoading }: { scenarios: Scenario[]; isLoading?: boolean }) {
  if (isLoading) return <SkeletonList count={3} />;
  return (
    <div className="list">
      {scenarios.map((scenario) => <Link key={scenario.id} className="list-item" to={`/scenarios/${scenario.id}`}><strong>{scenario.title}</strong><span>{scenario.description || "No description yet"}</span></Link>)}
      {scenarios.length === 0 ? <EmptyState message="No scenarios yet. Create your first scenario to start building a story." action={<Link className="button" to="/scenarios">Create Scenario</Link>} /> : null}
    </div>
  );
}
