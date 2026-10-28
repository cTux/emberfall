import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { LOBBY_PORTAL } from '../packages/core/src/index';

test('ability images, particles and swings apply opacity and owner filtering in Pixi', async ({
  page,
}) => {
  const require = createRequire(resolve('packages/client/package.json'));
  const { build } = await import(pathToFileURL(require.resolve('vite')).href);
  const bundle = await build({
    configFile: false,
    define: { 'process.env.NODE_ENV': '"production"' },
    root: resolve('packages/client'),
    logLevel: 'error',
    build: {
      write: false,
      minify: false,
      lib: {
        entry: resolve('tests/ability-effects-fixture.ts'),
        name: 'AbilityFixture',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  await page.route('**/ability-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }),
  );
  await page.goto('/ability-test');
  await page.addScriptTag({ content: code });
  const results = await page.evaluate(() =>
    (
      window as unknown as { AbilityFixture: typeof import('./ability-effects-fixture') }
    ).AbilityFixture.compare(),
  );
  for (const [kind, [full, half, invisible, otherHidden, ownVisible]] of Object.entries(results)) {
    expect(full, kind).toBeGreaterThan(0);
    expect(half, kind).toBeGreaterThan(full * 0.35);
    expect(half, kind).toBeLessThan(full * 0.75);
    expect(invisible, kind).toBe(0);
    expect(otherHidden, kind).toBe(0);
    expect(ownVisible, kind).toBe(full);
  }
});

test('ability settings default, update, survive presets and reload in village and forest', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const open = async () => {
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  };
  const slider = page.getByRole('slider', { name: 'Ability effect transparency' });
  const toggle = page.getByRole('switch', { name: "Hide other players' ability effects" });
  await open();
  await expect(toggle).toBeChecked();
  await expect(slider).toHaveAttribute('aria-valuenow', '0');
  await slider.focus();
  await page.keyboard.press('Home');
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight');
  await expect(slider).toHaveAttribute('aria-valuetext', '50%');
  await toggle.uncheck();
  await page.getByRole('button', { name: 'Low', exact: true }).click();
  await expect(toggle).not.toBeChecked();
  await expect(slider).toHaveAttribute('aria-valuetext', '50%');
  await page.screenshot({ path: 'test-results/ability-effect-settings.png' });
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await open();
  await expect(toggle).not.toBeChecked();
  await expect(slider).toHaveAttribute('aria-valuetext', '50%');
  await slider.focus();
  await page.keyboard.press('End');
  await expect(slider).toHaveAttribute('aria-valuetext', '100%');
  await page.getByRole('button', { name: 'Close Settings' }).click();
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  await page.setViewportSize({ width: 960, height: 640 });
  player.x = LOBBY_PORTAL.x - 35;
  player.y = LOBBY_PORTAL.y + 9;
  const portal = page.getByRole('dialog', { name: 'Forest portal' });
  await expect(async () => {
    await page.mouse.move(515, 281);
    await expect(page.locator('canvas')).toHaveAttribute('data-interaction-target', 'portal');
    await expect(page.locator('canvas')).toHaveAttribute('data-interaction-range', 'true');
    await page.mouse.click(515, 281);
    await expect(portal).toBeVisible();
  }).toPass({ intervals: [200], timeout: 6000 });
  await portal.getByRole('button', { name: 'Create', exact: true }).click();
  await portal.getByRole('button', { name: "I'm ready" }).click();
  await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
  await page.screenshot({ path: 'test-results/ability-effects-forest.png' });
  await open();
  await expect(slider).toHaveAttribute('aria-valuetext', '100%');
});
