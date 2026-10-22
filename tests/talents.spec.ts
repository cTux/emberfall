import { test, expect } from './fixtures';
import { TRAINING_ZONES } from '../packages/core/src/index.ts';

test('N opens linked talents without blocking movement; learning equips and casts a saved ability', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Talent hero');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  await expect(page.getByRole('button', { name: 'Talents (N)' })).toBeVisible();
  await page.keyboard.press('n');
  const tree = page.getByRole('region', { name: 'Talents', exact: true });
  await expect(tree).toBeVisible();
  await expect(tree.getByRole('status')).toHaveText('0 talent points available');
  player.level = 5;
  await expect(tree.getByRole('status')).toHaveText('4 talent points available');
  const beforeX = player.x;
  await page.keyboard.down('d');
  await expect.poll(() => player.x).toBeGreaterThan(beforeX + 10);
  await page.keyboard.up('d');
  await expect(tree.getByRole('button', { name: 'Sweeping strike: Locked' })).toHaveAttribute(
    'aria-disabled',
    'true',
  );
  for (const name of ['+1 power', '+10% attack speed', '+5% critical chance', 'Sweeping strike']) {
    const node = tree.getByRole('button', { name: `${name}: Available`, exact: true }).first();
    await node.click();
    await expect(
      tree.getByRole('button', { name: `${name}: Learned`, exact: true }).first(),
    ).toBeVisible();
  }
  await expect(tree.getByRole('status')).toHaveText('0 talent points available');
  const cast = page.getByRole('button', { name: 'Cast Sweeping strike (1)' });
  await expect(cast).toBeVisible();
  await page.screenshot({ path: 'test-results/talents-desktop.png' });
  await page.setViewportSize({ width: 390, height: 740 });
  await expect(tree).toBeVisible();
  const bounds = await tree.boundingBox();
  expect(bounds!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/talents-narrow.png' });
  await page.keyboard.press('n');
  await expect(tree).toHaveCount(0);
  player.x = TRAINING_ZONES[0].x;
  player.y = TRAINING_ZONES[0].y;
  await page.keyboard.press('1');
  await expect.poll(() => player.talentCooldowns?.['talent:warrior:0'] ?? 0).toBeGreaterThan(0);
  await expect(cast).toBeDisabled();
  await page.reload();
  await expect(cast).toBeVisible();
  await page.keyboard.press('n');
  await expect(tree.getByRole('button', { name: 'Sweeping strike: Learned' })).toBeVisible();
});
