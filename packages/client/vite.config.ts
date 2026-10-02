import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { Agent } from "node:https";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

export default defineConfig(({ command }) => {
  const buildId = command === "build" ? randomUUID() : "development";
  const shared = {
    define: { __BUILD_ID__: JSON.stringify(buildId) },
    plugins: [
      react(),
      {
        name: "client-version",
        generateBundle() {
          this.emitFile({
            type: "asset",
            fileName: "version.json",
            source: JSON.stringify({ buildId }),
          });
        },
        configureServer(server) {
          server.middlewares.use("/version.json", (_req, res) => {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Cache-Control", "no-store");
            res.end(JSON.stringify({ buildId }));
          });
        },
      } satisfies import("vite").Plugin,
    ],
  };
  if (command === "build")
    return {
      ...shared,
      build: {
        rolldownOptions: {
          output: {
            manualChunks: (id: string) => (id.includes("node_modules") ? "vendors" : undefined),
          },
        },
      },
    };
  const cert = readFileSync(new URL("../../.certs/localhost.pem", import.meta.url));
  return {
    ...shared,
    server: {
      port: 5173,
      strictPort: true,
      https: {
        cert,
        key: readFileSync(new URL("../../.certs/localhost-key.pem", import.meta.url)),
      },
      proxy: {
        "/ws": { target: "wss://127.0.0.1:3001", ws: true, agent: new Agent({ ca: cert }) },
      },
    },
  };
});
