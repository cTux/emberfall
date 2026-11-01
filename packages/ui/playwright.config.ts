import { defineConfig } from '@playwright/test';

// A minute allows Storybook cold compilation before the first desktop test.
const STORYBOOK_STARTUP_TIMEOUT_MS = 60_000;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:6007',
    viewport: { width: 1280, height: 900 },
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'pnpm exec storybook dev -p 6007 --host 127.0.0.1 --no-open --ci',
    url: 'http://127.0.0.1:6007',
    reuseExistingServer: !process.env.CI,
    timeout: STORYBOOK_STARTUP_TIMEOUT_MS,
  },
});
