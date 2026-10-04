import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { ViteImageOptimizer } from "vite-plugin-image-optimizer";
import { compression } from "vite-plugin-compression2";
import { visualizer } from "rollup-plugin-visualizer";
import { fileURLToPath } from "node:url";
import { Agent } from "node:https";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

export default defineConfig(({ command, mode }) => {
  const buildId = command === "build" ? randomUUID() : "development";
  const shared = {
    define: { __BUILD_ID__: JSON.stringify(buildId) },
    plugins: [
      react(),
      ViteImageOptimizer({
        test: /\.png$/i,
        includePublic: true,
        png: { compressionLevel: 9, adaptiveFiltering: true, palette: false },
      }),
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
      compression({
        algorithms: ["brotliCompress", "gzip"],
        include: /\.(js|mjs|css|html|json|svg)$/,
        exclude: /(^|\/)version\.json$/,
        threshold: 1024,
      }),
      mode === "analyze" &&
        visualizer({
          filename: fileURLToPath(
            new URL("./node_modules/.cache/bundle-report.html", import.meta.url),
          ),
          gzipSize: true,
          brotliSize: true,
          open: false,
        }),
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
  const serverPort = process.env.PORT_NEW ?? "3003";
  return {
    ...shared,
    server: {
      port: 5174,
      strictPort: true,
      https: {
        cert,
        key: readFileSync(new URL("../../.certs/localhost-key.pem", import.meta.url)),
      },
      proxy: {
        "/matchmake": { target: `https://127.0.0.1:${serverPort}`, agent: new Agent({ ca: cert }) },
        "/colyseus": {
          target: `wss://127.0.0.1:${serverPort}`,
          ws: true,
          rewrite: (path) => path.replace(/^\/colyseus/, ""),
          agent: new Agent({ ca: cert }),
        },
      },
    },
  };
});
