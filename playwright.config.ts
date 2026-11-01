import { defineConfig } from '@playwright/test';
const port = process.env.TEST_PORT_NEW ?? '3013';
export default defineConfig({
  testDir: './tests',
  workers: 1,
  // Ninety seconds accommodates startup and multi-step gameplay on slower CI desktops.
  timeout: 90000,
  use: {
    baseURL: `https://127.0.0.1:${port}`,
    ignoreHTTPSErrors: true,
    // Keep the established desktop capture dimensions for layout and pixel comparisons.
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
});
