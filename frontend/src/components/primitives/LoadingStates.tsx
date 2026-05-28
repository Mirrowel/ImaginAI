/**
 * Reusable UI primitives for loading and empty states.
 * Hearth Dark styled: subtle shimmer for loading, functional text for empty.
 */

/** A single skeleton block that mimics the shape of loaded content. */
export function SkeletonBlock({
  lines = 3,
  width,
}: {
  /** Number of skeleton lines to render */
  lines?: number;
  /** Override width of each line (CSS value). Defaults to staggered widths. */
  width?: string;
}) {
  return (
    <div className="skeleton-block" aria-hidden="true">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="skeleton-line"
          style={{
            width: width ?? (i === lines - 1 ? "40%" : i === 0 ? "90%" : "70%"),
          }}
        />
      ))}
    </div>
  );
}

/** A row of skeleton blocks that mimics a list of items. */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="skeleton-list" aria-hidden="true">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBlock key={i} lines={2} />
      ))}
    </div>
  );
}

/** A centered empty state with a message and optional action. */
export function EmptyState({
  message,
  action,
}: {
  /** Descriptive text explaining the empty state */
  message: string;
  /** Optional action element (button, link, etc.) */
  action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <p className="empty-state-message">{message}</p>
      {action ? <div className="empty-state-action">{action}</div> : null}
    </div>
  );
}
