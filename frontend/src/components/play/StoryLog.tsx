import { useCallback, useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { TurnView, type TurnAction } from "./TurnView";
import type { AdventureTurn } from "../../types";

interface StoryLogProps {
  turns: AdventureTurn[];
  adventureId: string;
  selectedModelId: string | null;
  activeActionTurnId: string | null;
  activeAction: TurnAction["type"] | null;
  onAction: (turnId: string, action: TurnAction) => void;
  onEditCancel: () => void;
  onDeleteCancel: () => void;
  /** Streaming turn elements rendered below the virtualized list */
  streamingContent: React.ReactNode;
  /** True only when the pinned streaming area has visible content. */
  hasStreamingContent: boolean;
  /** Monotonic-ish value that changes as streaming text/status grows. */
  streamingContentVersion: number;
}

/** Distance from bottom (px) to consider "near bottom" for auto-scroll. */
const NEAR_BOTTOM_THRESHOLD = 150;

/**
 * Virtualized story log with auto-scroll behavior.
 *
 * When the user is near the bottom (within 150px), new turns and streaming
 * content automatically scroll into view. When the user scrolls up, a subtle
 * "jump to latest" affordance appears.
 *
 * StreamingTurn is rendered OUTSIDE the virtualizer as a pinned element
 * at the bottom, not subject to virtualizer recalculation on every SSE event.
 */
export function StoryLog({
  turns,
  adventureId,
  activeActionTurnId,
  activeAction,
  onAction,
  onEditCancel,
  onDeleteCancel,
  streamingContent,
  hasStreamingContent,
  streamingContentVersion,
}: StoryLogProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const virtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  // Track scroll position: is the user near the bottom?
  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = distanceFromBottom <= NEAR_BOTTOM_THRESHOLD;
    isNearBottomRef.current = nearBottom;
    // Hide the jump button when user scrolls back to bottom
    if (nearBottom && showJumpToLatest) {
      setShowJumpToLatest(false);
    }
  }, [showJumpToLatest]);

  // Auto-scroll when new content arrives and user is near bottom
  const prevTurnCountRef = useRef(turns.length);
  useEffect(() => {
    // New turns added
    if (turns.length > prevTurnCountRef.current) {
      if (isNearBottomRef.current) {
        requestAnimationFrame(() => {
          const el = parentRef.current;
          if (el) el.scrollTop = el.scrollHeight;
        });
      } else {
        setShowJumpToLatest(true);
      }
    }
    prevTurnCountRef.current = turns.length;
  }, [turns.length]);

  // Auto-scroll during streaming if near bottom
  useEffect(() => {
    if (!hasStreamingContent) return;
    if (!isNearBottomRef.current) {
      // User has scrolled up during streaming: show jump affordance
      setShowJumpToLatest(true);
      return;
    }
    // Auto-scroll to bottom during streaming
    const el = parentRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [hasStreamingContent, streamingContentVersion]);

  const scrollToBottom = useCallback(() => {
    const el = parentRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
      isNearBottomRef.current = true;
      setShowJumpToLatest(false);
    }
  }, []);

  return (
    <div
      ref={parentRef}
      className="story-log-scroll"
      onScroll={handleScroll}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const turn = turns[virtualItem.index];
          return (
            <div
              key={turn.id}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualItem.start}px)`,
              }}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
            >
              <TurnView
                turn={turn}
                adventureId={adventureId}
                turnIndex={virtualItem.index + 1}
                totalTurns={turns.length}
                activeAction={activeActionTurnId === turn.id ? activeAction : null}
                onAction={onAction}
                onEditCancel={onEditCancel}
                onDeleteCancel={onDeleteCancel}
              />
            </div>
          );
        })}
      </div>
      {/* Streaming turn pinned outside the virtualizer */}
      {streamingContent}
      {/* Jump to latest affordance */}
      {showJumpToLatest ? (
        <button
          className="jump-to-latest"
          onClick={scrollToBottom}
          aria-label="Jump to latest content"
        >
          New content below
        </button>
      ) : null}
    </div>
  );
}
