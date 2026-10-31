import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from './fixtures';
import { LOOT_ITEM_IDS, rarityColor } from '../packages/core/src/index';

async function renderFixture(page: import('@playwright/test').Page) {
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
        entry: resolve('tests/renderer-fixture.ts'),
        name: 'RendererFixture',
        formats: ['iife'],
      },
    },
  });
  const code = bundle[0].output.find((item: { type: string }) => item.type === 'chunk').code;
  await page.route('**/renderer-test', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }),
  );
  await page.goto('/renderer-test');
  await page.addScriptTag({ content: code });
  return page.evaluate(async () => {
    const fixture = (window as unknown as { RendererFixture: typeof import('./renderer-fixture') })
      .RendererFixture;
    return fixture.compare();
  });
}

test('Pixi preserves transparent vignette centers and SVG debuff pixels', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'warning' && /blend|texture/i.test(message.text()))
      errors.push(message.text());
  });
  const {
    results,
    icons,
    stackLabels,
    lights,
    edges,
    damagePixels,
    groupedLabels,
    projectilePixels,
    lootPixels,
    battleTextPixels,
  } = await renderFixture(page);
  await page.screenshot({ path: 'test-results/new-renderer-pixels.png' });
  await page
    .locator('[data-preview="battle-text"]')
    .screenshot({ path: 'test-results/battle-text-phases.png' });
  expect(errors).toEqual([]);
  expect(results['interaction outline border'].actual).toEqual([255, 223, 0, 255]);
  expect(results['interaction outline outside'].actual).toEqual([128, 144, 96, 255]);
  for (const sample of [
    'health border top',
    'health border bottom',
    'tree health border',
    'gathering border',
  ])
    expect(results[sample].actual, sample).toEqual([40, 39, 27, 255]);
  expect(results['health fill top'].actual).toEqual([134, 217, 162, 255]);
  expect(results['health fill bottom'].actual).toEqual([134, 217, 162, 255]);
  expect(results['health empty track'].actual).toEqual([105, 90, 49, 255]);
  expect(results['health outside frame'].actual).toEqual([128, 144, 96, 255]);
  expect(results['prompt rounded corner'].actual).toEqual([128, 144, 96, 255]);
  expect(results['prompt face highlight'].actual[0]).toBeGreaterThan(
    results['prompt face shade'].actual[0] + 20,
  );
  for (const side of ['left', 'right', 'top', 'bottom']) {
    const [red, green, blue] = results[`prompt rim ${side}`].actual;
    expect(red).toBeGreaterThan(green);
    expect(green).toBeGreaterThan(blue);
  }
  const shaftCenter = results['shaft center'].actual[0];
  expect(shaftCenter).toBeGreaterThan(131);
  for (const edge of ['shaft left feather', 'shaft right feather'])
    expect(results[edge].actual[0]).toBeLessThanOrEqual(129);
  expect(results['shaft after camera move'].actual).toEqual(results['shaft center'].actual);
  expect(groupedLabels).toEqual(['8', '1']);
  for (const phases of battleTextPixels) {
    const [start, pop, settled, fading, expired] = phases;
    expect(pop.height).toBeGreaterThan(start.height);
    expect(pop.height).toBeGreaterThan(settled.height);
    expect(fading.top).toBeLessThan(settled.top);
    expect(fading.count).toBeGreaterThan(0);
    expect(expired.count).toBe(0);
  }
  expect(battleTextPixels[1][1].height).toBeGreaterThan(battleTextPixels[0][1].height);
  expect(lootPixels).toHaveLength(LOOT_ITEM_IDS.length + 1);
  for (const { itemId, colored, purple, beam, above, beside } of lootPixels) {
    expect(colored, `${itemId} visible icon`).toBeGreaterThan(30);
    expect(purple, `${itemId} has no placeholder square`).toBe(0);
    expect(beam, `${itemId} visible beam above icon`).toBeGreaterThan(0);
    expect(above, `${itemId} beam stays short`).toBe(0);
    expect(beside, `${itemId} beam stays narrow`).toBe(0);
  }
  expect(projectilePixels).toHaveLength(20);
  for (const [index, count] of projectilePixels.entries())
    expect(count, `projectile frame ${index}: ${projectilePixels.join(', ')}`).toBeGreaterThan(8);
  for (const { white, red } of damagePixels) {
    expect(white, 'critical white fill survives Pixi rendering').toBeGreaterThan(3);
    expect(red, 'critical red outline survives Pixi rendering').toBeGreaterThan(3);
  }
  expect(lights.reused).toBe(lights.first);
  expect(lights.translated).toBe(lights.first);
  expect(lights.moved).toBeGreaterThan(lights.first);
  expect(lights.toggled).toBeGreaterThan(lights.moved);
  expect(edges.every((count) => count > 0)).toBe(true);
  expect(stackLabels.silence).toEqual([]);
  for (const kind of ['bleed', 'poison', 'burn', 'roots'])
    expect(stackLabels[kind], `${kind} retains its stack count`).toEqual(['1']);
  for (const [kind, count] of Object.entries(icons))
    expect(count, `${kind} colored glyph`).toBeGreaterThan(2);
  for (const [name, { actual, expected }] of Object.entries(results)) {
    for (let channel = 0; channel < 4; channel++) {
      expect
        .soft(
          Math.abs(actual[channel] - expected[channel]),
          `${name}: ${actual.join(',')} vs ${expected.join(',')}`,
        )
        .toBeLessThanOrEqual(3);
    }
  }
});

test('Pixi renders all five item rarity beam colors', async ({ page }) => {
  const { rarityPixels } = await renderFixture(page);
  for (const { rarity, color } of rarityPixels) {
    const expected = [1, 3, 5].map((offset) =>
      parseInt(rarityColor[rarity].slice(offset, offset + 2), 16),
    );
    expect(color[3], `${rarity} beam alpha`).toBeGreaterThan(30);
    const brightness = Math.max(...color.slice(0, 3));
    expect(brightness, `${rarity} visible beam`).toBeGreaterThan(5);
    const opacity = brightness / Math.max(...expected);
    for (let channel = 0; channel < 3; channel++)
      expect(
        Math.abs(color[channel] - expected[channel] * opacity),
        `${rarity} beam color`,
      ).toBeLessThanOrEqual(4);
  }
});
