import { ChangeEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePreviewImport, useConfirmImport } from "../../hooks/useImport";
import { Panel } from "../primitives/Panel";

/** AID import preview/confirm flow with warning display. */
export function ImportFlow() {
  const [raw, setRaw] = useState("{}");
  const [kind, setKind] = useState<"aid" | "native">("aid");
  const [preview, setPreview] = useState<import("../../types").ImportPreview | null>(null);
  const navigate = useNavigate();
  const previewMutation = usePreviewImport();
  const confirm = useConfirmImport();
  /** Load an uploaded JSON file into the preview textarea for AID/native import. */
  async function readFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setRaw(await file.text());
  }
  return <section className="stack"><Panel title="Import Scenario"><div className="mode-row"><button className={kind === "aid" ? "active" : "ghost"} onClick={() => setKind("aid")}>AI Dungeon</button><button className={kind === "native" ? "active" : "ghost"} onClick={() => setKind("native")}>ImaginAI Native</button></div><input type="file" accept="application/json,.json" onChange={readFile} /><textarea className="json-input" value={raw} onChange={(event) => setRaw(event.target.value)} /><button onClick={() => previewMutation.mutate({ kind, data: JSON.parse(raw) }, { onSuccess: setPreview })}>Preview</button>{preview ? <div className="subcard stack"><h3>{preview.scenario.title}</h3>{preview.warnings.length > 0 ? <div><p className="eyebrow">Warnings</p>{preview.warnings.map((warning) => <p className="warning" key={warning}>{warning}</p>)}</div> : null}{preview.scenario.modules.length > 0 ? <div><p className="eyebrow">Modules ({preview.scenario.modules.length})</p><ul className="import-preview-list">{preview.scenario.modules.map((mod, i) => <li key={i}><strong>{mod.title || "Untitled Module"}</strong>{!mod.isEnabled ? <span className="tag warning">disabled</span> : null}</li>)}</ul></div> : null}{preview.scenario.cards.length > 0 ? <div><p className="eyebrow">Cards ({preview.scenario.cards.length})</p><ul className="import-preview-list">{preview.scenario.cards.map((card, i) => <li key={i}><strong>{card.title || "Untitled Card"}</strong> <span className="tag">{card.cardType}</span>{!card.isEnabled ? <span className="tag warning">disabled</span> : null}</li>)}</ul></div> : null}<details><summary>Mapped Preview</summary><pre>{JSON.stringify(preview.scenario, null, 2)}</pre></details><button onClick={() => confirm.mutate({ kind, preview }, { onSuccess: (scenario) => navigate(`/scenarios/${scenario.id}`) })}>Confirm Import</button></div> : null}</Panel></section>;
}
