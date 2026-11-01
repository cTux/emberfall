import { Peer } from '../packages/server/src/network/peer.ts';
import { test, expect } from './fixtures';

// Preserve the method for call(this, ...) and restore it after each isolated test.
// oxlint-disable-next-line typescript/unbound-method
const originalSend = Peer.prototype.send;
test.afterEach(() => {
  Peer.prototype.send = originalSend;
});

test('connection indicator compares server versions and gives outages priority', async ({
  page,
}, info) => {
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        (window as unknown as { versionSocket: WebSocket }).versionSocket = this;
      }
    };
  });
  await page.goto('/');
  const online = page.getByRole('status', { name: 'World server online' });
  await expect(online).toBeVisible();
  await expect(online).toHaveCSS('background-color', 'rgb(131, 203, 163)');
  await expect(online).toHaveAttribute('title', /^Game 1\.0\.\d+ · Server 1\.0\.\d+$/);
  await online.screenshot({ path: info.outputPath('version-matched.png') });

  // Change only server metadata while retaining the real SDK connection.

  Peer.prototype.send = function (message) {
    return originalSend.call(
      this,
      message.type === 'pong' ? { ...message, version: '9.0.375' } : message,
    );
  };

  const mismatch = page.getByRole('status', { name: 'World server mismatch' });
  await expect(mismatch).toBeVisible();
  await expect(mismatch).toHaveCSS('background-color', 'rgb(230, 190, 128)');
  await expect(mismatch).toHaveAttribute('title', /^Game 1\.0\.\d+ · Server 9\.0\.\d+$/);
  await mismatch.screenshot({ path: info.outputPath('version-mismatch.png') });

  await page.route('**/matchmake/**', (route) => {
    return route.abort();
  });
  await page.evaluate(() => {
    (window as unknown as { versionSocket: WebSocket }).versionSocket.close();
  });
  const offline = page.getByRole('status', { name: 'World server disconnected' });
  await expect(offline).toBeVisible();
  await expect(offline).toHaveCSS('background-color', 'rgb(239, 155, 133)');
  await offline.screenshot({ path: info.outputPath('server-unavailable.png') });
});

test('a silent server turns red and begins reconnecting', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('status', { name: 'World server online' })).toBeVisible();
  await page.route('**/matchmake/**', (route) => {
    return route.abort();
  });
  Peer.prototype.send = function (message) {
    if (message.type !== 'pong') {
      originalSend.call(this, message);
    }
  };

  await expect(page.getByRole('status', { name: 'World server disconnected' })).toBeVisible({
    // A five-second probe deadline is observed at the next two-second ping.
    timeout: 10_000,
  });
});

test('a newer app build warns without automatically reloading or blocking play', async ({
  page,
}) => {
  let navigations = 0;
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) {
      navigations++;
    }
  });
  await page.route('**/version.json', async (route) => {
    const response = await route.fetch();
    const manifest = await response.json();
    await route.fulfill({ json: { ...manifest, buildId: 'new-app-build' } });
  });
  await page.goto('/');
  const indicator = page.getByRole('status', { name: 'World server mismatch' });
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveAttribute('title', /App update available; refresh when ready/);
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  expect(navigations).toBe(1);
});
