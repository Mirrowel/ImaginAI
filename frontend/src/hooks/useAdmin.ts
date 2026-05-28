import { useQuery } from "@tanstack/react-query";
import * as api from "../api";

/** Fetch admin-only domain diagnostics. */
export function useAdminDiagnostics() {
  return useQuery({ queryKey: ["adminDiagnostics"], queryFn: api.adminDiagnostics });
}

/** Fetch admin-only app-level usage rows. */
export function useAdminUsage() {
  return useQuery({ queryKey: ["adminUsage"], queryFn: api.adminUsage });
}
