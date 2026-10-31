import { test, expect } from './fixtures';

import { sharp } from './interaction-outlines.fixture.ts';

test('Alt outlines party candidates without changing E interaction', async ({
  page,
  browser,
  game,
}) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const other = await context.newPage();
    for (const [client, name] of [
      [page, 'Alpha'],
      [other, 'Bravo'],
    ] as const) {
      await client.goto('/');
      await client.getByLabel('Your adventurer name').fill(name);
      await client.getByRole('button', { name: /^Join Playtest Default/ }).click();
      await expect(client.getByRole('button', { name: 'Leave world' })).toBeVisible();
    }

    const world = [...game.runtime.worlds.values()].find((w) => w.players.size === 2)!;
    const a = [...world.players.values()].find((p) => p.name === 'Alpha')!;
    const b = [...world.players.values()].find((p) => p.name === 'Bravo')!;
    a.x = 1800;
    a.y = 1800;
    b.x = 1830;
    b.y = 1800;
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Invite to party');
    const candidateGreen = async () => {
      const image = await page.screenshot({
        path: 'test-results/alt-party-crop.png',
        clip: { x: 745, y: 445, width: 50, height: 90 },
      });
      const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
      let count = 0;
      for (let i = 0; i < data.length; i += info.channels)
        if (data[i + 1] > 70 && data[i] < data[i + 1] * 0.65 && data[i + 2] < data[i + 1] * 0.65)
          count++;

      return count;
    };

    const before = await candidateGreen();
    await page.keyboard.down('Alt');
    await expect.poll(candidateGreen).toBeGreaterThan(before + 20);
    await canvas.screenshot({ path: 'test-results/alt-party-player.png' });
    await page.keyboard.up('Alt');
    await expect.poll(candidateGreen).toBeLessThan(before + 10);
    await page.keyboard.press('e');
    await expect(other.locator('canvas')).toHaveAttribute('data-interaction-prompt', 'Accept');
  } finally {
    await context.close();
  }
});
