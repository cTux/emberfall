import { defineConfig } from "vite";
export default defineConfig({
  build: {
    ssr: "src/index.ts",
    target: "node24",
    outDir: "dist",
    rollupOptions: { output: { entryFileNames: "index.js" } },
  },
  ssr: { noExternal: ["@emberfall/common"] },
});
