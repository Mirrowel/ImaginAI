import { useMutation } from "@tanstack/react-query";
import * as api from "../api";
import type { ImportPreview, Scenario } from "../types";

/** Preview an import payload (AID or native). */
export function usePreviewImport() {
  return useMutation({
    mutationFn: ({ kind, data }: { kind: "aid" | "native"; data: unknown }) =>
      kind === "aid" ? api.previewAid(data) : api.previewNative(data),
  });
}

/** Confirm an import preview and create a scenario. */
export function useConfirmImport() {
  return useMutation({
    mutationFn: ({ kind, preview }: { kind: "aid" | "native"; preview: ImportPreview }) =>
      kind === "aid" ? api.confirmAid(preview) : api.confirmNative(preview),
  });
}
