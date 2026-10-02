import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  use: {
    baseURL: "http://127.0.0.1:6007",
    viewport: { width: 1280, height: 900 },
    trace: "retain-on-failure",
  },
  webServer: {
    command: "pnpm exec storybook dev -p 6007 --host 127.0.0.1 --no-open --ci",
    url: "http://127.0.0.1:6007",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
