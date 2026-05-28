import { ReactNode } from "react";

/** Reusable titled panel for app sections. */
export function Panel({ title, children }: { title: string; children: ReactNode }) {
  return <section className="card"><h2>{title}</h2>{children}</section>;
}
