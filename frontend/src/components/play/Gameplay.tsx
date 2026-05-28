import { FormEvent, useCallback, useState } from "react";
import { useParams } from "react-router-dom";
import { useAdventure } from "../../hooks/useAdventure";
import { useAvailableModels } from "../../hooks/useModels";
import { useGenerate, useContinue } from "../../hooks/useGeneration";
import { useUiStore } from "../../uiStore";
import { FullScreenMessage } from "../primitives/FullScreenMessage";
import { ModelPicker } from "../primitives/ModelPicker";
import { StoryLog } from "./StoryLog";
import { ContextPanel } from "./ContextPanel";
import type { GenerationEvent } from "../../types";
import type { TurnAction } from "./TurnView";

/**
 * Main gameplay screen.
 *
 * Layout: story log (scroll) + composer (fixed) as flex siblings.
 * Context panel overlays from right without reflow.
 * Adventure state and memory tools are accessed via the context panel
 * (state mode), not as separate below-story panels.
 */
export function Gameplay() {
  const { adventureId } = useParams();
  const {
    actionType, setActionType,
    selectedModelId, setSelectedModelId,
    textStreamingEnabled, streamThinking, showThinkingDefault,
    contextPanelOpen, setContextPanelOpen, setContextPanelMode, setContextPanelTurnId,
  } = useUiStore();

  // Streaming state (local, not Zustand)
  const [content, setContent] = useState("");
  const [streamText, setStreamText] = useState("");
  const [streamThinkingText, setStreamThinkingText] = useState("");
  const [streamStatus, setStreamStatus] = useState("");
  const [showThinking, setShowThinking] = useState(showThinkingDefault);

  // Quick settings
  const [showQuickSettings, setShowQuickSettings] = useState(false);
  const [quickContextLimit, setQuickContextLimit] = useState("");
  const [quickTargetTokens, setQuickTargetTokens] = useState("");
  const [quickTemperature, setQuickTemperature] = useState("");
  const [quickTopP, setQuickTopP] = useState("");
  const [quickThinkingEnabled, setQuickThinkingEnabled] = useState(false);
  const [quickShowThinking, setQuickShowThinking] = useState(false);

  // Active turn action (only one turn expanded at a time)
  const [activeActionTurnId, setActiveActionTurnId] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<TurnAction["type"] | null>(null);

  // Data hooks
  const adventure = useAdventure(adventureId);
  const models = useAvailableModels();
  const generate = useGenerate(adventureId!, () => setContent(""));
  const cont = useContinue(adventureId!);

  function buildGenerationSettings(): Record<string, unknown> | undefined {
    const settings: Record<string, unknown> = {};
    if (quickContextLimit) settings.contextLimit = Number(quickContextLimit);
    if (quickTargetTokens) settings.visibleTargetTokens = Number(quickTargetTokens);
    if (quickTemperature) settings.temperature = Number(quickTemperature);
    if (quickTopP) settings.topP = Number(quickTopP);
    if (quickThinkingEnabled) settings.thinkingEnabled = true;
    if (quickShowThinking) settings.showThinking = true;
    return Object.keys(settings).length > 0 ? settings : undefined;
  }
  const generationSettings = buildGenerationSettings();

  // ALL hooks must be declared before any early return to avoid rules-of-hooks violations.

  const handleTurnAction = useCallback((turnId: string, action: TurnAction) => {
    if (action.type === "edit" || action.type === "delete") {
      setActiveActionTurnId(turnId);
      setActiveAction(action.type);
    } else if (action.type === "fork" || action.type === "retry" || action.type === "inspect") {
      setActiveActionTurnId(null);
      setActiveAction(null);
      setContextPanelTurnId(turnId);
      setContextPanelMode(action.type);
      setContextPanelOpen(true);
    }
  }, [setContextPanelOpen, setContextPanelMode, setContextPanelTurnId]);

  const handleEditCancel = useCallback(() => {
    setActiveActionTurnId(null);
    setActiveAction(null);
  }, []);

  const handleDeleteCancel = useCallback(() => {
    setActiveActionTurnId(null);
    setActiveAction(null);
  }, []);

  // Early return AFTER all hooks
  if (!adventure.data) return <FullScreenMessage title="Loading adventure" />;
  const isGenerating = generate.isPending || cont.isPending;
  const turns = adventure.data.turns ?? [];

  function handleGenerationEvent(event: GenerationEvent) {
    if (event.type === "generation.status") setStreamStatus(`${event.phase}: ${event.message}`);
    if (event.type === "generation.content_delta") setStreamText((current) => current + event.text);
    if (event.type === "generation.thinking_delta") {
      if (streamThinking) setStreamThinkingText((current) => current + event.text);
      if (quickShowThinking || showThinkingDefault) setShowThinking(true);
    }
    if (event.type === "generation.final") setStreamText(event.content);
    if (event.type === "generation.error") setStreamStatus(event.message);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (content.trim()) {
      setStreamThinkingText(""); setStreamText(""); setStreamStatus("");
      generate.mutate({ textStreamingEnabled, actionType, content, modelConfigId: selectedModelId, onEvent: handleGenerationEvent, generationSettings });
    }
  }

  // Streaming turn content (pinned outside virtualizer)
  const streamingContent = (
    <>
      {streamThinkingText && showThinking ? (
        <details className="turn assistant thinking-panel" open>
          <summary className="eyebrow">Thinking</summary>
          <div className="thinking-content">{streamThinkingText}</div>
        </details>
      ) : null}
      {streamText ? (
        <article className="turn assistant streaming" aria-live="polite">
          <p className="eyebrow">Streaming · {streamStatus}</p>
          <div>{streamText}</div>
        </article>
      ) : null}
    </>
  );

  return (
    <section className="gameplay">
      <header className="section-heading">
        <h1>{adventure.data.title}</h1>
        <div className="section-heading-actions">
          <button
            type="button"
            className="ghost"
            onClick={() => { setContextPanelMode("state"); setContextPanelTurnId(null); setContextPanelOpen(true); }}
            aria-label="Open adventure state panel"
          >
            State
          </button>
          <ModelPicker models={models.data?.items ?? []} value={selectedModelId} onChange={setSelectedModelId} />
        </div>
      </header>

      {/* Story log + composer grid: scroll area + fixed composer */}
      <div className="gameplay-body">
        <StoryLog
          turns={turns}
          adventureId={adventureId!}
          selectedModelId={selectedModelId}
          activeActionTurnId={activeActionTurnId}
          activeAction={activeAction}
          onAction={handleTurnAction}
          onEditCancel={handleEditCancel}
          onDeleteCancel={handleDeleteCancel}
          streamingContent={streamingContent}
          hasStreamingContent={Boolean(streamText || (streamThinkingText && showThinking))}
          streamingContentVersion={streamText.length + streamThinkingText.length + streamStatus.length}
        />
        <form className="composer" onSubmit={submit}>
          <div className="mode-row">
            {(["do", "say", "story"] as const).map((mode) => (
              <button
                type="button"
                className={mode === actionType ? "active" : ""}
                key={mode}
                onClick={() => setActionType(mode)}
                aria-pressed={mode === actionType}
              >
                {mode}
              </button>
            ))}
            <button
              type="button"
              className={`ghost${showQuickSettings ? " active" : ""}`}
              onClick={() => setShowQuickSettings((v) => !v)}
            >
              Settings
            </button>
          </div>
          {showQuickSettings ? (
            <div className="quick-settings">
              <label>Context limit<input type="number" placeholder="default" value={quickContextLimit} onChange={(event) => setQuickContextLimit(event.target.value)} /></label>
              <label>Target tokens<input type="number" placeholder="default" value={quickTargetTokens} onChange={(event) => setQuickTargetTokens(event.target.value)} /></label>
              <label>Temperature<input type="number" step="0.1" placeholder="default" value={quickTemperature} onChange={(event) => setQuickTemperature(event.target.value)} /></label>
              <label>Top P<input type="number" step="0.01" placeholder="default" value={quickTopP} onChange={(event) => setQuickTopP(event.target.value)} /></label>
              <label className="checkbox"><input type="checkbox" checked={quickThinkingEnabled} onChange={(event) => setQuickThinkingEnabled(event.target.checked)} /> Thinking</label>
              <label className="checkbox"><input type="checkbox" checked={quickShowThinking} onChange={(event) => setQuickShowThinking(event.target.checked)} /> Show thinking</label>
            </div>
          ) : null}
          <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={`What do you ${actionType}?`} />
          <div className="mode-row">
            <button disabled={isGenerating}>Submit</button>
            <button type="button" className="ghost" disabled={isGenerating} onClick={() => { setStreamThinkingText(""); setStreamText(""); setStreamStatus(""); cont.mutate({ textStreamingEnabled, modelConfigId: selectedModelId, onEvent: handleGenerationEvent, generationSettings }); }}>Continue</button>
          </div>
          {streamStatus ? <p className="muted">{streamStatus}</p> : null}
        </form>
      </div>

      {/* Context panel (overlay) — state/fork/retry/inspect/streaming */}
      <ContextPanel
        adventureId={adventureId!}
        adventure={adventure.data}
        models={models.data?.items ?? []}
        selectedModelId={selectedModelId}
        onGenerationEvent={handleGenerationEvent}
        generationSettings={generationSettings}
        streamStatus={streamStatus}
        streamThinkingText={streamThinkingText}
        turns={turns}
      />
    </section>
  );
}
