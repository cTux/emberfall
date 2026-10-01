import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { Agent } from "node:https";
import { readFileSync } from "node:fs";

export default defineConfig(({ command }) => {
  if (command === "build") return { plugins: [react()] };
  const cert = readFileSync(new URL("../../.certs/localhost.pem", import.meta.url));
  return {
    plugins: [react()],
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
