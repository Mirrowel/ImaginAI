import { useState } from "react";
import { Link } from "react-router-dom";
import { useScenarios } from "../../hooks/useScenario";
import { useAdventures } from "../../hooks/useAdventure";
import { useAvailableModels } from "../../hooks/useModels";
import { Panel } from "../primitives/Panel";
import { ScenarioList } from "./ScenarioList";
import { PageInfo } from "./PageInfo";
import { SkeletonList, EmptyState } from "../primitives/LoadingStates";

/** Dashboard with recent scenarios, adventures entry points, and setup warnings. */
export function Dashboard() {
  const [adventurePage, setAdventurePage] = useState(1);
  const scenarios = useScenarios();
  const adventures = useAdventures(adventurePage);
  const models = useAvailableModels();
  return (
    <section className="stack">
      <header className="hero"><p className="eyebrow">Story sandbox</p><h1>Build worlds, fork adventures, and steer the model.</h1></header>
      {models.data?.total === 0 ? <div className="notice">No enabled models yet. Add a provider and model config before live AI generation, or enable fake LLM mode for local tests.</div> : null}
      <div className="grid two">
        <Panel title="Recent Scenarios"><ScenarioList scenarios={scenarios.data?.items ?? []} isLoading={scenarios.isLoading} /></Panel>
        <Panel title="Recent Adventures">{adventures.isLoading ? <SkeletonList count={3} /> : <div className="list">{adventures.data?.items.map((adventure) => <Link className="list-item" key={adventure.id} to={`/adventures/${adventure.id}`}><strong>{adventure.title}</strong><span>{adventure.parentAdventureId ? "Fork" : "Root"} · {adventure.status}</span></Link>)}{adventures.data?.items?.length === 0 ? <EmptyState message="No adventures yet. Start one from a scenario." action={<Link className="button ghost" to="/scenarios">Browse Scenarios</Link>} /> : null}{adventures.data?.items?.[0] ? <Link className="button" to={`/adventures/${adventures.data.items[0].id}`}>Quick Continue</Link> : null}</div>}<PageInfo total={adventures.data?.total ?? 0} shown={adventures.data?.items?.length ?? 0} hasMore={adventures.data?.hasMore} onLoadMore={() => setAdventurePage((p) => p + 1)} /></Panel>
        <Panel title="Quick Actions"><Link className="button" to="/scenarios">Create or edit scenarios</Link><Link className="button ghost" to="/import">Import AID scenario</Link></Panel>
      </div>
    </section>
  );
}
