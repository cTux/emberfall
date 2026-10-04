import { defineConfig } from "@playwright/test";
const dev = process.env.TEST_DEV === "1";
const port = process.env.TEST_PORT || "3002";
const baseURL = dev ? "https://127.0.0.1:5173" : `https://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL, ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } },
  webServer: dev
    ? {
        command: "pnpm dev",
        env: {},
        url: baseURL,
        reuseExistingServer: false,
        ignoreHTTPSErrors: true,
      }
    : undefined,
});
