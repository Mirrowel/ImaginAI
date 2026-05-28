/** Simple page metadata display with optional load-more control for paginated list results. */
export function PageInfo({ total, shown, hasMore, onLoadMore }: { total: number; shown: number; hasMore?: boolean; onLoadMore?: () => void }) {
  if (total === 0) return null;
  return <div className="page-info"><span>Showing {shown} of {total}</span>{hasMore && onLoadMore ? <button className="ghost" onClick={onLoadMore}>Load more</button> : null}</div>;
}
