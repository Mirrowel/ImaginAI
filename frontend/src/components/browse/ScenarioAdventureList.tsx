import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useScenarioAdventures, useStartAdventure, useArchiveAdventure, useDeleteAdventure } from "../../hooks/useAdventure";
import { useScenario as useScenarioDetail } from "../../hooks/useScenario";
import { PageInfo } from "./PageInfo";
import { SkeletonList, EmptyState } from "../primitives/LoadingStates";

/** Scenario-specific adventure list with start, continue, archive, and delete actions. */
export function ScenarioAdventureList() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const adventures = useScenarioAdventures(scenarioId, page);
  const scenario = useScenarioDetail(scenarioId);
  const startNew = useStartAdventure((adventure) => { adventures.refetch(); navigate(`/adventures/${adventure.id}`); });
  const archive = useArchiveAdventure(scenarioId);
  const remove = useDeleteAdventure(scenarioId);
  const items = adventures.data?.items ?? [];
  const activeAdventures = items.filter((a) => a.status === "active");
  const lastActive = activeAdventures[0];
  return <section className="stack">
    <header className="section-heading"><h1>Adventures</h1><div className="mode-row"><button onClick={() => startNew.mutate({ scenarioId: scenarioId!, title: scenario.data?.title })} disabled={startNew.isPending}>Start New Adventure</button>{lastActive ? <Link className="button ghost" to={`/adventures/${lastActive.id}`}>Continue: {lastActive.title}</Link> : null}</div></header>
    {adventures.isLoading ? <SkeletonList count={4} /> : <div className="list">{items.map((adventure) => (
      <div className="list-item" key={adventure.id}>
        <div className="adventure-row-header"><Link to={`/adventures/${adventure.id}`}><strong>{adventure.title}</strong></Link><span className={`tag ${adventure.status === "active" ? "" : "warning"}`}>{adventure.status}</span></div>
        <span className="muted">{adventure.parentAdventureId ? "Fork" : "Root adventure"}{adventure.parentAdventureId ? ` · parent ${adventure.parentAdventureId.slice(0, 8)}…` : ""}</span>
        <div className="mode-row"><Link className="button ghost" to={`/adventures/${adventure.id}`}>{adventure.status === "active" ? "Continue" : "View"}</Link>{adventure.status === "active" ? <button className="ghost" onClick={() => archive.mutate(adventure.id)} disabled={archive.isPending}>Archive</button> : null}{adventure.status !== "deleted" ? <button className="ghost" onClick={() => remove.mutate(adventure.id)} disabled={remove.isPending}>Delete</button> : null}</div>
      </div>
    ))}{items.length === 0 ? <EmptyState message="No adventures yet for this scenario. Start one to begin playing." /> : null}</div>}
    <PageInfo total={adventures.data?.total ?? 0} shown={items.length} hasMore={adventures.data?.hasMore} onLoadMore={() => setPage((p) => p + 1)} />
  </section>;
}
