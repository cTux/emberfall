import { test, expect } from '@playwright/test';
import { story } from './ui.fixture.ts';

test('party bars use sixty percent of their old width with compact coins immediately after', async ({
  page,
}, testInfo) => {
  for (const [variant, amount, compact] of [
    ['playground', 13, '13'],
    ['thousands', 1000, '1k'],
    ['millions', 3000000, '3m'],
  ] as const) {
    await page.goto(story(`components-partycard--${variant}`));
    for (const width of [1280, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const meter = page.getByRole('progressbar', { name: 'Astrid, lvl 1' });
      const coins = page.getByLabel(`Astrid: ${amount} coins`, { exact: true });
      await expect(coins).toHaveText(compact);
      const bar = (await meter.boundingBox())!;
      const available = await meter
        .locator('../../..')
        .evaluate((element) => element.getBoundingClientRect().width);
      expect(bar.width).toBeCloseTo(available * 0.6, 0);
      const balance = (await coins.boundingBox())!;
      expect(balance.x).toBeCloseTo(bar.x + bar.width + 8, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: testInfo.outputPath(`coins-${variant}-${width}.png`) });
    }
  }
});

test('companion health sits beneath the player at desktop and narrow widths', async ({
  page,
}, testInfo) => {
  await page.goto(story('components-partycard--with-companion'));
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const player = page.getByRole('progressbar', { name: 'Astrid, lvl 1' });
    const companion = page.getByRole('progressbar', { name: 'Bear', exact: true });
    await expect(companion).toHaveAttribute('aria-valuenow', '75');
    await expect(companion).toHaveAttribute('aria-valuemax', '150');
    const p = (await player.boundingBox())!;
    const c = (await companion.boundingBox())!;
    expect(c.y).toBeGreaterThanOrEqual(p.y + p.height);
    expect(c.height).toBeLessThan(p.height);
    expect(c.width).toBeLessThan(p.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`companion-${width}.png`) });
  }
  await page.goto(story('components-partycard--defeated-companion'));
  await expect(page.getByRole('progressbar', { name: 'Bear', exact: true })).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
});

test('party keeps portrait corner icons beside health with a thinner XP row below', async ({
  page,
}, testInfo) => {
  await page.goto(story('components-partycard--host-away'));
  for (const width of [1280, 320]) {
    await page.setViewportSize({ width, height: 800 });
    const card = page.getByRole('article');
    const meter = card.getByRole('progressbar', { name: 'Astrid, lvl 1' });
    await expect(card.getByRole('progressbar')).toHaveCount(2);
    const xp = card.getByRole('progressbar', { name: 'Astrid XP', exact: true });
    await expect(xp).toHaveAttribute('aria-valuetext', '25 / 50');
    await expect(card.getByText('Astrid, lvl 1', { exact: true })).toBeVisible();
    await expect(card.getByText('Host', { exact: true })).toHaveCount(0);
    const host = card.getByRole('img', { name: 'Host', exact: true });
    const dimension = card.getByRole('img', { name: 'In another dimension' });
    const portrait = host.locator('..');
    const p = (await portrait.boundingBox())!;
    const h = (await host.boundingBox())!;
    const d = (await dimension.boundingBox())!;
    const m = (await meter.boundingBox())!;
    const x = (await xp.boundingBox())!;
    expect(x.y).toBeGreaterThanOrEqual(m.y + m.height);
    expect(x.height).toBeLessThan(m.height);
    expect(p.height).toBe(m.height);
    expect(p.y).toBe(m.y);
    expect(h.y).toBe(p.y);
    expect(d.y).toBe(p.y);
    expect(d.x).toBe(p.x);
    expect(h.x + h.width).toBeCloseTo(p.x + p.width, 0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: testInfo.outputPath(`party-${width}.png`) });
  }
});
