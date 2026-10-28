import { test, expect } from './fixtures';
import { createTrainingScene } from '../packages/core/src/index.ts';

test('loot hints show an uncapped confirmed burst, expire, and persist their setting', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  let player = [...world.players.values()][0];
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-loot-hint-count', '0');
  const settings = () => page.getByRole('button', { name: 'Settings', exact: true }).click();
  const close = () => page.getByRole('button', { name: 'Close Settings' }).click();
  const toggle = page.getByRole('switch', { name: 'Loot hints', exact: true });
  await settings();
  await expect(toggle).toBeChecked();
  await close();
  const ids = [
    'health-potion',
    'stone',
    'log',
    'stick',
    'leaf',
    'rock',
    'empty-bottle',
    'loot-helmet',
    'loot-boots',
    'loot-gloves',
    'loot-leggings',
    'loot-bodyArmor',
    'loot-amulet',
    'loot-ring',
    'loot-shield',
    'loot-quiver',
    'loot-orb',
    'loot-natureFocus',
    'fern',
    'berry-bush',
  ];
  player.backpack = ids.map((itemId, i) => ({ id: `hint-${i}`, itemId, quantity: i < 7 ? 3 : 1 }));
  await expect(canvas).toHaveAttribute('data-loot-hint-count', '20');
  await page.screenshot({ path: 'test-results/loot-hints-village.png' });
  await expect(canvas).toHaveAttribute('data-loot-hint-count', '0');
  await settings();
  await toggle.uncheck();
  await close();
  player.backpack![0].quantity++;
  await expect(canvas).toHaveAttribute('data-loot-hint-count', '0');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await settings();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await close();
  player = [...world.players.values()][0];
  player.scene = 'forest';
  game.runtime.parties(world).run(player).scene = {
    ...createTrainingScene(Date.now()),
    id: 'loot-hints-test',
    electorate: '',
    training: false,
    enemies: [],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
  };
  await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
  player.backpack![0].quantity += 2;
  await expect(canvas).toHaveAttribute('data-loot-hint-count', '1');
  await page.screenshot({ path: 'test-results/loot-hints-forest.png' });
  await expect(canvas).toHaveAttribute('data-loot-hint-count', '0');
  expect(errors).toEqual([]);
});
