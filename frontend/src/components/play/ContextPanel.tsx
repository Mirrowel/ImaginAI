import { useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Tabs from "@radix-ui/react-tabs";
import { useForkAdventure, useStreamRetryTurn, useVariants, useSelectVariant, useContextReport, usePromptSnapshot, useTokenUsage } from "../../hooks/useTurn";
import { useUiStore } from "../../uiStore";
import type { Adventure, AdventureTurn, GenerationEvent, ModelConfig } from "../../types";
import { AdventureStatePanel } from "./AdventureStatePanel";
import { AdventureStateEventList } from "./AdventureStatePanel";
import { AdventureMemoryPanel } from "./AdventureMemoryPanel";

/**
 * Right overlay context panel. Mounts on open, unmounts on close.
 * Modes: state | fork | retry | inspect | streaming.
 * Overlay model: position fixed, slides from right. Story log width never changes.
 *
 * The `state` mode renders AdventureStatePanel and AdventureMemoryPanel
 * as sub-sections, replacing the legacy below-story collapsible panels.
 */
export function ContextPanel({
  adventureId,
  adventure,
  models,
  selectedModelId,
  onGenerationEvent,
  generationSettings,
  streamStatus,
  streamThinkingText,
  turns,
}: {
  adventureId: string;
  adventure: Adventure;
  models: ModelConfig[];
  selectedModelId: string | null;
  onGenerationEvent: (event: GenerationEvent) => void;
  generationSettings?: Record<string, unknown>;
  streamStatus?: string;
  streamThinkingText?: string;
  turns: AdventureTurn[];
}) {
  const { contextPanelOpen, contextPanelMode, contextPanelTurnId, setContextPanelOpen, setContextPanelMode, setContextPanelTurnId } = useUiStore();
  const selectedTurn = contextPanelTurnId ? turns.find((turn) => turn.id === contextPanelTurnId) : null;

  if (!contextPanelOpen) return null;

  return (
    <>
      {/* Mobile-only scrim: dismisses panel on tap */}
      <div
        className="context-panel-scrim"
        aria-hidden="true"
        onClick={() => { setContextPanelOpen(false); setContextPanelTurnId(null); }}
      />
      <aside className="context-panel" aria-label="Context panel">
        <div className="context-panel-header">
        <h2 className="context-panel-title">
          {contextPanelMode === "state" && "Adventure State"}
          {contextPanelMode === "fork" && "Fork Turn"}
          {contextPanelMode === "retry" && "Retry Turn"}
          {contextPanelMode === "inspect" && "Inspect Turn"}
          {contextPanelMode === "streaming" && "Streaming"}
        </h2>
        <button
          className="ghost context-panel-close"
          onClick={() => { setContextPanelOpen(false); setContextPanelTurnId(null); }}
          aria-label="Close context panel"
        >
          Close
        </button>
      </div>
      <div className="context-panel-body">
        {contextPanelMode === "state" ? (
          <Tabs.Root defaultValue="state" className="state-tabs-root">
            <Tabs.List className="state-tabs-list" aria-label="Adventure tooling">
              <Tabs.Trigger className="state-tabs-trigger" value="state">State</Tabs.Trigger>
              <Tabs.Trigger className="state-tabs-trigger" value="memory">Memory</Tabs.Trigger>
              <Tabs.Trigger className="state-tabs-trigger" value="events">Events</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content className="state-tabs-content" value="state">
              <AdventureStatePanel adventure={adventure} models={models} />
            </Tabs.Content>
            <Tabs.Content className="state-tabs-content" value="memory">
              <AdventureMemoryPanel adventureId={adventureId} />
            </Tabs.Content>
            <Tabs.Content className="state-tabs-content" value="events">
              <AdventureStateEventList adventureId={adventureId} />
            </Tabs.Content>
          </Tabs.Root>
        ) : null}
        {contextPanelMode === "fork" && contextPanelTurnId ? (
          <ForkForm adventureId={adventureId} turn={selectedTurn} turnId={contextPanelTurnId} />
        ) : null}
        {contextPanelMode === "retry" && contextPanelTurnId ? (
          <RetryForm
            adventureId={adventureId}
            turn={selectedTurn}
            selectedModelId={selectedModelId}
            onGenerationEvent={onGenerationEvent}
            generationSettings={generationSettings}
          />
        ) : null}
        {contextPanelMode === "inspect" && contextPanelTurnId ? (
          <InspectView adventureId={adventureId} turnId={contextPanelTurnId} />
        ) : null}
        {contextPanelMode === "streaming" ? (
          <StreamingView streamStatus={streamStatus} streamThinkingText={streamThinkingText} />
        ) : null}
      </div>
    </aside>
    </>
  );
}

// ---------------------------------------------------------------------------
// Fork Form
// ---------------------------------------------------------------------------

function ForkForm({ adventureId, turn, turnId }: { adventureId: string; turn: AdventureTurn | null | undefined; turnId: string }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [switchToFork, setSwitchToFork] = useState(true);
  const forkHook = useForkAdventure();

  return (
    <form
      className="context-panel-form stack"
      onSubmit={(e) => {
        e.preventDefault();
        forkHook.mutate(
          { adventureId, fromTurnId: turnId, title: title || `Fork from turn ${turn?.sequence ?? ""}`.trim(), note, switchToFork },
          { onSuccess: (forked) => { if (forked.switchToFork) navigate(`/adventures/${forked.id}`); } }
        );
      }}
    >
      <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Fork title" /></label>
      <label>Note<input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Fork note" /></label>
      <label className="checkbox"><input type="checkbox" checked={switchToFork} onChange={(e) => setSwitchToFork(e.target.checked)} /> Switch to fork</label>
      <button disabled={forkHook.isPending}>Fork</button>
      {forkHook.error ? <p className="error">{String(forkHook.error.message)}</p> : null}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Retry Form
// ---------------------------------------------------------------------------

function RetryForm({ adventureId, turn, selectedModelId, onGenerationEvent, generationSettings }: {
  adventureId: string;
  turn: AdventureTurn | null | undefined;
  selectedModelId: string | null;
  onGenerationEvent: (event: GenerationEvent) => void;
  generationSettings?: Record<string, unknown>;
}) {
  const [retryInstruction, setRetryInstruction] = useState("");
  const [includeVariantIds, setIncludeVariantIds] = useState<string[]>([]);
  const retryHook = useStreamRetryTurn();

  const responseGroupId = turn?.responseGroupId;

  if (!turn) return <p className="muted">Selected turn is no longer available.</p>;
  if (!responseGroupId) return <p className="muted">This turn does not have retry variants.</p>;

  return (
    <div className="context-panel-form stack">
      <label>Guidance
        <input
          value={retryInstruction}
          onChange={(e) => setRetryInstruction(e.target.value)}
          placeholder="Retry guidance"
        />
      </label>
      <VariantSelector
        adventureId={adventureId}
        responseGroupId={responseGroupId}
        selectedIds={includeVariantIds}
        onToggle={(id) => setIncludeVariantIds((ids) =>
          ids.includes(id) ? ids.filter((i) => i !== id) : [...ids, id]
        )}
      />
      <button
        disabled={!retryInstruction.trim() || retryHook.isPending}
        onClick={() => retryHook.mutate({
          adventureId,
          responseGroupId,
          retryInstruction,
          modelConfigId: selectedModelId,
          includeVariantIds,
          onEvent: onGenerationEvent,
          generationSettings,
        })}
      >
        Retry
      </button>
      {retryHook.error ? <p className="error">{String(retryHook.error.message)}</p> : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Variant Selector
// ---------------------------------------------------------------------------

function VariantSelector({ adventureId, responseGroupId, selectedIds, onToggle }: {
  adventureId: string;
  responseGroupId: string;
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  const variants = useVariants(adventureId, responseGroupId);
  const selectHook = useSelectVariant();
  if (!variants.data || variants.data.total <= 1) return null;

  return (
    <div className="variant-list">
      {variants.data.items.map((variant) => (
        <div className="list-item" key={variant.id}>
          <button
            className={variant.isActive ? "active" : "ghost"}
            onClick={() => selectHook.mutate({ adventureId, variantId: variant.id })}
          >
            Variant {variant.createdAt.slice(11, 19)}
          </button>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={selectedIds.includes(variant.id)}
              onChange={() => onToggle(variant.id)}
            />
            Include in retry
          </label>
          <p className="muted">{variant.content.slice(0, 180)}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inspect View
// ---------------------------------------------------------------------------

function InspectView({ adventureId, turnId }: { adventureId: string; turnId: string }) {
  const report = useContextReport(adventureId, turnId);
  const snapshot = usePromptSnapshot(adventureId, turnId, !!report.data);
  const usage = useTokenUsage(adventureId, turnId, !!report.data);

  if (report.isLoading) return <p className="muted">Loading context report...</p>;
  if (!report.data) return <p className="muted">No context report available for this turn.</p>;

  return (
    <div className="stack">
      <div className="subcard stack">
        <h3>Context Report</h3>
        <p>Turns: {report.data.includedTurnRange.first ?? "none"} to {report.data.includedTurnRange.last ?? "none"}</p>
        <p>Activated cards: {report.data.activatedCards.length}</p>
        {usage.data ? <p>{usage.data.totalTokens} tokens · {usage.data.provider}/{usage.data.modelId}</p> : null}
      </div>
      <details className="subcard">
        <summary>Token estimates by layer</summary>
        <pre className="json-input-sm">{JSON.stringify(report.data.estimatedTokensByLayer, null, 2)}</pre>
      </details>
      {snapshot.data ? (
        <details className="subcard">
          <summary>Prompt Messages</summary>
          <pre className="json-input-sm">{JSON.stringify(snapshot.data.messages, null, 2)}</pre>
        </details>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Streaming View
// ---------------------------------------------------------------------------

function StreamingView({ streamStatus, streamThinkingText }: {
  streamStatus?: string;
  streamThinkingText?: string;
}) {
  return (
    <div className="stack">
      {streamStatus ? <p>{streamStatus}</p> : null}
      {streamThinkingText ? (
        <details className="subcard thinking-panel" open>
          <summary>Thinking</summary>
          <div className="thinking-content">{streamThinkingText}</div>
        </details>
      ) : null}
      <p className="muted" aria-live="polite">Streaming in progress...</p>
    </div>
  );
}
