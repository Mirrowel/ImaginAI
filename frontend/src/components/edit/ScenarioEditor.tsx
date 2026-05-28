import { FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import * as Tabs from "@radix-ui/react-tabs";
import { useScenario, useScenarioVersions, useUpdateScenario, useCreateScenarioModule, useDuplicateScenario, useFreezeScenario, useDeleteScenario, useExportScenario } from "../../hooks/useScenario";
import { useStartAdventure } from "../../hooks/useAdventure";
import { useAvailableModels } from "../../hooks/useModels";
import { FullScreenMessage } from "../primitives/FullScreenMessage";
import { ModuleEditor } from "./ModuleEditor";
import { ScenarioCardEditor } from "./ScenarioCardEditor";
import { downloadJson } from "../../lib/downloadJson";

/**
 * Writer-studio scenario editor with Radix Tabs.
 *
 * Layout: header (title + action bar) above a tabbed authoring surface.
 * Tabs: Metadata | Modules | Cards | Versions
 * All hooks, mutations, query keys, and field shapes preserved.
 */
export function ScenarioEditor() {
  const { scenarioId } = useParams();
  const navigate = useNavigate();
  const scenario = useScenario(scenarioId);
  const versions = useScenarioVersions(scenarioId);
  const models = useAvailableModels();
  const save = useUpdateScenario(scenarioId!);
  const start = useStartAdventure((adventure) => navigate(`/adventures/${adventure.id}`));
  const duplicate = useDuplicateScenario((copy) => navigate(`/scenarios/${copy.id}`));
  const freeze = useFreezeScenario(scenarioId!);
  const remove = useDeleteScenario(() => navigate("/scenarios"));
  const exportScenario = useExportScenario(scenarioId!);
  const addModule = useCreateScenarioModule(scenarioId!);

  const [activeTab, setActiveTab] = useState("metadata");

  if (!scenario.data) return <FullScreenMessage title="Loading scenario" />;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const defaultModelConfigId = String(form.get("defaultModelConfigId") || "");
    save.mutate({ title: String(form.get("title")), description: String(form.get("description")), tags: String(form.get("tags")).split(",").map((tag) => tag.trim()).filter(Boolean), defaultModelConfigId: defaultModelConfigId || null } as Partial<import("../../types").Scenario>);
  }

  return (
    <section className="scenario-editor">
      {/* Header: title + action bar */}
      <header className="scenario-editor-header">
        <h1>{scenario.data.title}</h1>
        <div className="scenario-editor-actions">
          <button onClick={() => start.mutate({ scenarioId: scenarioId!, title: scenario.data?.title })}>
            Start Adventure
          </button>
          <button className="ghost" onClick={() => duplicate.mutate({ id: scenarioId!, title: `${scenario.data?.title} Copy` })}>
            Duplicate
          </button>
          <button className="ghost" onClick={() => freeze.mutate(undefined)}>
            Freeze Version
          </button>
          <button className="ghost" onClick={() => exportScenario.mutate(undefined, { onSuccess: (data) => downloadJson(`${scenario.data?.title || "scenario"}.imaginai.json`, data) })}>
            Export
          </button>
          <Link className="button ghost" to={`/scenarios/${scenarioId}/adventures`}>
            Adventures
          </Link>
          <button className="ghost editor-danger" onClick={() => remove.mutate(scenarioId!)}>
            Delete
          </button>
        </div>
      </header>

      {/* Tabbed authoring surface */}
      <Tabs.Root value={activeTab} onValueChange={setActiveTab} className="editor-tabs-root">
        <Tabs.List className="editor-tabs-list" aria-label="Scenario editor sections">
          <Tabs.Trigger value="metadata" className="editor-tabs-trigger">Metadata</Tabs.Trigger>
          <Tabs.Trigger value="modules" className="editor-tabs-trigger">
            Modules{scenario.data.modules?.length ? ` (${scenario.data.modules.length})` : ""}
          </Tabs.Trigger>
          <Tabs.Trigger value="cards" className="editor-tabs-trigger">
            Cards{scenario.data.cards?.length ? ` (${scenario.data.cards.length})` : ""}
          </Tabs.Trigger>
          <Tabs.Trigger value="versions" className="editor-tabs-trigger">Versions</Tabs.Trigger>
        </Tabs.List>

        {/* Metadata tab */}
        <Tabs.Content value="metadata" className="editor-tabs-content">
          <form className="card stack" onSubmit={submit}>
            <label>Title<input name="title" defaultValue={scenario.data.title} /></label>
            <label>Description<textarea name="description" defaultValue={scenario.data.description} /></label>
            <label>Tags<input name="tags" defaultValue={scenario.data.tags.join(", ")} /></label>
            <label>Default Model<select name="defaultModelConfigId" defaultValue={scenario.data.defaultModelConfigId ?? ""}><option value="">No default (use user preference)</option>{models.data?.items.map((model) => <option key={model.id} value={model.id}>{model.displayName}</option>)}</select></label>
            <div><button disabled={save.isPending}>Save Metadata</button>{save.isSuccess ? <span className="muted" style={{ marginLeft: "0.5rem" }}>Saved</span> : null}</div>
          </form>
        </Tabs.Content>

        {/* Modules tab */}
        <Tabs.Content value="modules" className="editor-tabs-content">
          <div className="editor-tab-header">
            <h2 className="editor-tab-title">Prompt Modules</h2>
            <button className="ghost" onClick={() => addModule.mutate({ title: "New Module", moduleType: "custom", content: "" })}>Add Module</button>
          </div>
          <div className="stack">
            {scenario.data.modules?.length ? (
              scenario.data.modules.map((module, index) => (
                <ModuleEditor key={module.id} module={module} modules={scenario.data.modules ?? []} index={index} scenarioId={scenarioId!} />
              ))
            ) : (
              <div className="editor-empty-state">
                <p className="muted">No modules yet. Modules are sections of the system prompt sent to the AI.</p>
                <button className="ghost" onClick={() => addModule.mutate({ title: "New Module", moduleType: "custom", content: "" })}>Create your first module</button>
              </div>
            )}
          </div>
        </Tabs.Content>

        {/* Cards tab */}
        <Tabs.Content value="cards" className="editor-tabs-content">
          <ScenarioCardEditor scenarioId={scenarioId!} cards={scenario.data.cards ?? []} />
        </Tabs.Content>

        {/* Versions tab */}
        <Tabs.Content value="versions" className="editor-tabs-content">
          <div className="editor-tab-header">
            <h2 className="editor-tab-title">Version History</h2>
          </div>
          {versions.data?.items?.length ? (
            <div className="list">
              {versions.data.items.map((version) => (
                <div className="list-item" key={version.id}>
                  <strong>v{version.versionNumber}: {version.title}</strong>
                  <span>{version.changeNote || "No note"} &middot; {version.createdAt}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="editor-empty-state">
              <p className="muted">No versions yet. Freeze the current draft to create an immutable version.</p>
              <button className="ghost" onClick={() => freeze.mutate(undefined)}>Freeze current draft</button>
            </div>
          )}
        </Tabs.Content>
      </Tabs.Root>
    </section>
  );
}
