import { memo, useCallback, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useSaveTurn, useDeleteTurn, useRestoreTurn } from "../../hooks/useTurn";
import type { AdventureTurn } from "../../types";

export type TurnAction =
  | { type: "edit" }
  | { type: "delete" }
  | { type: "fork" }
  | { type: "retry" }
  | { type: "inspect" };

export interface TurnActionCallbacks {
  onAction: (turnId: string, action: TurnAction) => void;
}

interface TurnViewProps {
  turn: AdventureTurn;
  adventureId: string;
  /** 1-based index in the turn list, for display and aria */
  turnIndex: number;
  /** Total turns in the adventure, for delete-from-here count */
  totalTurns: number;
  /** Active inline action for THIS turn, if any */
  activeAction: TurnAction["type"] | null;
  onAction: (turnId: string, action: TurnAction) => void;
  onEditCancel: () => void;
  onDeleteCancel: () => void;
}

/**
 * Memoized turn component. Read mode by default.
 * Only re-renders when its own turn data, active action, or position changes.
 *
 * The `...` button is always rendered, always in Tab order.
 * Desktop: opacity 0.4 default, 1 on hover/focus.
 * Mobile: opacity 1 always.
 */
export const TurnView = memo(function TurnView({
  turn,
  adventureId,
  turnIndex,
  totalTurns,
  activeAction,
  onAction,
  onEditCancel,
  onDeleteCancel,
}: TurnViewProps) {
  const isAssistant = turn.role === "assistant";
  const isDeleted = turn.isDeleted;
  const saveTurn = useSaveTurn(adventureId, turn.id);
  const deleteTurn = useDeleteTurn(adventureId, turn.id);
  const restoreTurn = useRestoreTurn(adventureId, turn.id);

  return (
    <article
      className={`turn ${turn.role} ${isDeleted ? "deleted" : ""}`}
      role="article"
      aria-label={`Turn ${turnIndex}, ${turn.role}`}
    >
      {/* Turn content */}
      {activeAction === "edit" ? (
        <EditInline
          content={turn.content}
          onSave={(content) => saveTurn.mutate(content, { onSuccess: onEditCancel })}
          onCancel={onEditCancel}
        />
      ) : (
        <div className="turn-content">{turn.content}</div>
      )}

      {/* Attribution line */}
      <div className="turn-attribution">
        <span className="turn-meta">
          {turn.role}
          {" "}· #{turn.sequence}
          {isDeleted ? <span className="deleted-badge">Deleted</span> : null}
        </span>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="turn-actions-trigger"
              aria-label={`Actions for turn ${turnIndex}, ${turn.role}`}
            >
              ...
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content className="turn-actions-menu" sideOffset={4} align="end">
              <DropdownMenu.Item className="turn-actions-item" onSelect={() => onAction(turn.id, { type: "edit" })}>
                Edit
              </DropdownMenu.Item>
              <DropdownMenu.Item className="turn-actions-item" onSelect={() => onAction(turn.id, { type: "fork" })}>
                Fork
              </DropdownMenu.Item>
              {isAssistant ? (
                <DropdownMenu.Item className="turn-actions-item" onSelect={() => onAction(turn.id, { type: "retry" })}>
                  Retry
                </DropdownMenu.Item>
              ) : null}
              {isAssistant ? (
                <DropdownMenu.Item className="turn-actions-item" onSelect={() => onAction(turn.id, { type: "inspect" })}>
                  Inspect
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Separator className="turn-actions-separator" />
              <DropdownMenu.Item
                className="turn-actions-item turn-actions-danger"
                onSelect={() => onAction(turn.id, { type: "delete" })}
              >
                {isDeleted ? "Restore" : "Delete"}
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Inline delete confirmation */}
      {activeAction === "delete" && !isDeleted ? (
        <DeleteConfirmInline
          turnSequence={turn.sequence}
          totalTurns={totalTurns}
          onConfirm={(mode, revertState) => deleteTurn.mutate({ mode, revertStateChangesAfterPoint: revertState }, { onSuccess: onDeleteCancel })}
          onCancel={onDeleteCancel}
        />
      ) : null}

      {/* Inline restore confirmation */}
      {activeAction === "delete" && isDeleted ? (
        <RestoreInline
          turnSequence={turn.sequence}
          totalTurns={totalTurns}
          onConfirm={(mode, revertState) => restoreTurn.mutate({ mode, restoreStateChangesAfterPoint: revertState }, { onSuccess: onDeleteCancel })}
          onCancel={onDeleteCancel}
        />
      ) : null}
    </article>
  );
}, (prev, next) => {
  // Custom comparator: only re-render when turn data or active action changes
  return (
    prev.turn.id === next.turn.id &&
    prev.turn.content === next.turn.content &&
    prev.turn.isDeleted === next.turn.isDeleted &&
    prev.turn.sequence === next.turn.sequence &&
    prev.activeAction === next.activeAction &&
    prev.turnIndex === next.turnIndex &&
    prev.totalTurns === next.totalTurns
  );
});

// ---------------------------------------------------------------------------
// Inline Edit
// ---------------------------------------------------------------------------

function EditInline({ content, onSave, onCancel }: {
  content: string;
  onSave: (content: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(content);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onSave(draft);
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }, [draft, onSave, onCancel]);

  return (
    <div className="turn-edit-inline">
      <textarea
        className="turn-edit-textarea"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        autoFocus
      />
      <div className="turn-edit-actions">
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <button onClick={() => onSave(draft)}>Save</button>
      </div>
      <p className="muted">Ctrl+Enter to save, Escape to cancel</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Delete Confirmation
// ---------------------------------------------------------------------------

function DeleteConfirmInline({ turnSequence, totalTurns, onConfirm, onCancel }: {
  turnSequence: number;
  totalTurns: number;
  onConfirm: (mode: "from_here" | "single", revertState: boolean) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"from_here" | "single">("single");
  const [revertState, setRevertState] = useState(false);
  const turnsAffected = mode === "from_here" ? totalTurns - turnSequence + 1 : 1;

  return (
    <div
      className="turn-delete-confirm"
      role="alertdialog"
      aria-label="Confirm turn deletion"
      aria-describedby="delete-scope"
    >
      <p id="delete-scope">
        {mode === "from_here"
          ? `Delete from here onward (${turnsAffected} turn${turnsAffected !== 1 ? "s" : ""})`
          : "Delete this turn only"}
      </p>
      <div className="turn-delete-controls">
        <label className="radio">
          <input type="radio" name={`delete-mode-${turnSequence}`} checked={mode === "single"} onChange={() => setMode("single")} />
          Single turn
        </label>
        <label className="radio">
          <input type="radio" name={`delete-mode-${turnSequence}`} checked={mode === "from_here"} onChange={() => setMode("from_here")} />
          From here onward
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={revertState} onChange={(e) => setRevertState(e.target.checked)} />
          Revert state changes after point
        </label>
      </div>
      <div className="turn-delete-actions">
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <button className="turn-delete-confirm-btn" onClick={() => onConfirm(mode, revertState)}>
          Delete
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inline Restore Confirmation
// ---------------------------------------------------------------------------

function RestoreInline({ turnSequence, totalTurns, onConfirm, onCancel }: {
  turnSequence: number;
  totalTurns: number;
  onConfirm: (mode: "from_here" | "single", revertState: boolean) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"from_here" | "single">("single");
  const [revertState, setRevertState] = useState(false);
  const turnsAffected = mode === "from_here" ? totalTurns - turnSequence + 1 : 1;

  return (
    <div className="turn-delete-confirm">
      <p>
        {mode === "from_here"
          ? `Restore from here onward (${turnsAffected} turn${turnsAffected !== 1 ? "s" : ""})`
          : "Restore this turn only"}
      </p>
      <div className="turn-delete-controls">
        <label className="radio">
          <input type="radio" name={`restore-mode-${turnSequence}`} checked={mode === "single"} onChange={() => setMode("single")} />
          Single turn
        </label>
        <label className="radio">
          <input type="radio" name={`restore-mode-${turnSequence}`} checked={mode === "from_here"} onChange={() => setMode("from_here")} />
          From here onward
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={revertState} onChange={(e) => setRevertState(e.target.checked)} />
          Restore state changes after point
        </label>
      </div>
      <div className="turn-delete-actions">
        <button className="ghost" onClick={onCancel}>Cancel</button>
        <button onClick={() => onConfirm(mode, revertState)}>Restore</button>
      </div>
    </div>
  );
}

export default TurnView;
