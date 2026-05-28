import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useScenarios, useCreateScenario } from "../../hooks/useScenario";
import { ScenarioList } from "./ScenarioList";
import { PageInfo } from "./PageInfo";

/** Scenario library with create/import/edit/adventure entry points and load-more pagination. */
export function ScenarioLibrary() {
  const [title, setTitle] = useState("Untitled Scenario");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const scenarios = useScenarios(page);
  const create = useCreateScenario((scenario) => navigate(`/scenarios/${scenario.id}`));
  const allItems = scenarios.data?.items ?? [];
  const filtered = search ? allItems.filter((s) => s.title.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase()) || s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()))) : allItems;
  return (
    <section className="stack">
      <header className="section-heading"><h1>Scenario Library</h1><Link className="button ghost" to="/import">Import</Link></header>
      <form className="inline-form" onSubmit={(event) => { event.preventDefault(); create.mutate(title); }}><input value={title} onChange={(event) => setTitle(event.target.value)} /><button>Create Scenario</button></form>
      <input className="search-input" placeholder="Search scenarios by title, description, or tag…" value={search} onChange={(event) => setSearch(event.target.value)} />
      <ScenarioList scenarios={filtered} />
      <PageInfo total={scenarios.data?.total ?? 0} shown={filtered.length} hasMore={scenarios.data?.hasMore} onLoadMore={() => setPage((p) => p + 1)} />
    </section>
  );
}
