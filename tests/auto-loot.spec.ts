import { test, expect } from './fixtures';
import { createTrainingScene } from '../packages/core/src/index.ts';

test('auto-loot setting applies live, persists after reload and resumes item pickup', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Looter');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await settings.click();
  const toggle = page.getByRole('switch', { name: 'Auto-loot items', exact: true });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  await expect.poll(() => player.autoLoot).toBe(false);
  await page.setViewportSize({ width: 390, height: 800 });
  await expect(toggle).toBeVisible();
  await page.screenshot({ path: 'test-results/auto-loot-settings-narrow.png' });
  await page.reload();
  await settings.click();
  await expect(toggle).not.toBeChecked();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({ path: 'test-results/auto-loot-settings-desktop.png' });
  const current = [...world.players.values()][0];
  await expect.poll(() => current.autoLoot).toBe(false);
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  current.scene = 'forest';
  game.runtime.parties(world).run([...world.players.values()][0]).scene = {
    ...createTrainingScene(Date.now()),
    id: 'auto-loot-test',
    electorate: '',
    training: false,
    enemies: [],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
    drops: [
      {
        id: 1,
        kind: 'item',
        itemId: 'loot-helmet',
        x: current.x + 55,
        y: current.y,
        at: Date.now() - 1000,
      },
      { id: 2, kind: 'gold', x: current.x, y: current.y, at: Date.now() - 1000 },
    ],
  };
  await expect.poll(() => current.coins).toBe(1);
  expect(current.backpack?.length ?? 0).toBe(0);
  expect(game.runtime.parties(world).run([...world.players.values()][0]).scene!.drops).toHaveLength(
    1,
  );
  await page.screenshot({ path: 'test-results/dropped-item-beam-forest.png' });
  await settings.click();
  await toggle.check();
  await expect.poll(() => current.autoLoot).toBe(true);
  await expect.poll(() => current.backpack?.[0]?.itemId).toBe('loot-helmet');
  expect(game.runtime.parties(world).run([...world.players.values()][0]).scene!.drops).toHaveLength(
    0,
  );
});
