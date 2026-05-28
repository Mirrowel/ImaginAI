import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const configDir = dirname(fileURLToPath(import.meta.url));
const backendEnv = readBackendEnv(resolve(configDir, "..", ".env.backend"));
const backendOrigin = resolveBackendOrigin(backendEnv);

console.info(`[vite] proxy /api -> ${backendOrigin}`);

/** Read the root backend env file for dev-server proxy settings only. */
function readBackendEnv(path: string): Record<string, string> {
  if (!existsSync(path)) return {};
  return readFileSync(path, "utf-8").split(/\r?\n/).reduce<Record<string, string>>((values, rawLine) => {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || !line.includes("=")) return values;
    const [rawKey, ...rawValue] = line.split("=");
    const key = rawKey.trim();
    const value = rawValue.join("=").trim().replace(/^['\"]|['\"]$/g, "");
    if (key) values[key] = value;
    return values;
  }, {});
}

/** Resolve the Django origin for Vite's server-side dev proxy without exposing secrets to app code. */
function resolveBackendOrigin(env: Record<string, string>): string {
  if (env.BACKEND_ORIGIN) return env.BACKEND_ORIGIN;
  if (process.env.VITE_BACKEND_ORIGIN) return process.env.VITE_BACKEND_ORIGIN;
  const host = env.BACKEND_HOST || "127.0.0.1";
  const port = env.BACKEND_PORT || "8000";
  return `http://${host}:${port}`;
}

/** Configure Vite for the React rewrite frontend. */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: "./src/testSetup.ts",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: backendOrigin,
        changeOrigin: true,
      },
    },
  },
});
