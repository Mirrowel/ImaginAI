/** Render a full-screen loading or error message. */
export function FullScreenMessage({ title }: { title: string }) {
  return <div className="full-screen"><h1>{title}</h1></div>;
}
