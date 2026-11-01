import { test, expect } from './fixtures';

test('talent tree refreshes confirmed ranks, levels and class while snapshots keep arriving', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await page.getByRole('button', { name: 'Talents', exact: true }).click();
  const tree = page.getByRole('region', { name: 'Talents', exact: true });
  const world = [...game.runtime.worlds.values()].find((entry) => {
    return entry.players.size;
  })!;
  const player = [...world.players.values()][0];
  const first = tree.locator('[data-talent-node="v2:warrior:0:0"]');
  await expect(tree.getByRole('status')).toHaveText('1 talent point available');
  await first.click();
  await expect(first).toHaveAccessibleName(/rank 1 of 2/);
  await expect(tree.getByRole('status')).toHaveText('0 talent points available');
  player.level = 2;
  await expect(tree.getByRole('status')).toHaveText('1 talent point available');
  await first.click();
  await expect(first).toHaveAccessibleName(/rank 2 of 2/);
  player.classId = 'mage';
  player.talents = {};
  await expect(tree.locator('[data-talent-node="v2:mage:0:0"]')).toBeVisible();
  await expect(tree.getByRole('status')).toHaveText('2 talent points available');
  await page.screenshot({ path: 'test-results/talent-learning-desktop.png' });
});
