import type { ModelConfig } from "../../types";

/** Model picker showing merged personal/global available model configs. */
export function ModelPicker({ models, value, onChange }: { models: ModelConfig[]; value: string | null; onChange: (value: string | null) => void }) {
  return <select value={value ?? ""} onChange={(event) => onChange(event.target.value || null)}><option value="">Default model</option>{models.map((model) => <option key={model.id} value={model.id}>{model.displayName} ({model.ownerType})</option>)}</select>;
}
