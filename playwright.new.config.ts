import { defineConfig } from "@playwright/test";
const port = process.env.TEST_PORT_NEW ?? "3013";
export default defineConfig({
  testDir: "./tests-new",
  workers: 1,
  timeout: 90000,
  use: {
    baseURL: `https://127.0.0.1:${port}`,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1000 },
    trace: "retain-on-failure",
  },
});
