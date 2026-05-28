import { useRef } from "react";
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
}

/**
 * Virtualized story log. Uses @tanstack/react-virtual with
 * estimated turn height of 120px and overscan of 5.
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
}: StoryLogProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: turns.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  return (
    <div ref={parentRef} className="story-log-scroll">
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
    </div>
  );
}
