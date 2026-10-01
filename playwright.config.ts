import { defineConfig } from "@playwright/test";
const dev = process.env.TEST_DEV === "1";
const baseURL = dev ? "https://127.0.0.1:5173" : "https://127.0.0.1:3002";
export default defineConfig({
  testDir: "./tests",
  workers: 1,
  use: { baseURL, ignoreHTTPSErrors: true, viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: dev ? "pnpm dev" : "pnpm start",
    env: dev ? {} : { PORT: "3002", SAVE_PATH: ":memory:" },
    url: dev ? baseURL : `${baseURL}/health`,
    reuseExistingServer: false,
    ignoreHTTPSErrors: true,
  },
});
