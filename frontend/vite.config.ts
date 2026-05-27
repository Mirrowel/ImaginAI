import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Configure Vite for the React rewrite frontend. */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8000",
    },
  },
});
