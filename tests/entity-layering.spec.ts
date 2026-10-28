import { test, expect } from './fixtures';
import { BUILDINGS, LOBBY_PORTAL, CLASS_IDS } from '../packages/core/src/index.ts';
import type { SceneState } from '../packages/common/src/index.ts';

test('dummies, remote players and forest enemies layer around the local player', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Layer tester');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.attackAt = Date.now() + 600000;
  const dummy = world.training!.enemies[0];
  // Server-arranged poses cross the real Colyseus snapshot and render path.
  const capture = async (name: string, x: number, y: number) => {
    player.x = x;
    player.y = y;
    await page.waitForTimeout(700); // Let interpolation and render reconciliation settle.
    await page.screenshot({ path: `test-results/layering-${name}.png` });
    expect(player.hitpoints).toBe(player.maxHitpoints);
  };
  const captureAbilities = async (scene: SceneState, area: string, x: number, y: number) => {
    for (const talentClass of CLASS_IDS) {
      scene.explosions = [0, 1, 2].map((talentColumn) => ({
        id: ++scene.sequence,
        x: x + (talentColumn - 1) * 80,
        y,
        at: Date.now(),
        durationMs: 600000,
        talentClass,
        talentColumn,
      }));
      await capture(`${area}-${talentClass}-abilities`, x, y + 12);
    }
    scene.explosions = [];
  };
  const house = BUILDINGS[0];
  await capture('house-behind', house.x, house.y - 34);
  await capture('house-front', house.x, house.y + 20);
  await capture('dummy-behind', dummy.x, dummy.y - 12);
  await capture('dummy-front', dummy.x, dummy.y + 12);
  await capture('dummy-clear', dummy.x + 70, dummy.y - 12);
  await captureAbilities(world.training!, 'training', dummy.x, dummy.y);
  const remote = {
    ...player,
    id: 'layer-remote',
    name: 'Other player',
    x: dummy.x,
    y: dummy.y,
    attackAt: Date.now() + 600000,
  };
  world.players.set(remote.id, remote);
  dummy.x += 150;
  await capture('player-behind', remote.x, remote.y - 12);
  await capture('player-front', remote.x, remote.y + 12);
  world.players.delete(remote.id);
  await page.setViewportSize({ width: 960, height: 640 });
  player.x = LOBBY_PORTAL.x - 35;
  player.y = LOBBY_PORTAL.y + 9;
  const portal = page.getByRole('dialog', { name: 'Forest portal' });
  await expect(async () => {
    await page.mouse.move(515, 281);
    await expect(page.locator('canvas')).toHaveAttribute('data-interaction-target', 'portal');
    await expect(page.locator('canvas')).toHaveAttribute('data-interaction-range', 'true');
  }).toPass({ intervals: [200], timeout: 6000 });
  await page.mouse.click(515, 281);
  await expect(portal).toBeVisible();
  await portal.getByRole('button', { name: 'Create', exact: true }).click();
  await portal.getByRole('button', { name: "I'm ready" }).click();
  await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
  const scene = game.runtime.parties(world).run([...world.players.values()][0]).scene!;
  scene.nextSpawn = Date.now() + 600000;
  scene.spawns = [];
  scene.projectiles = [];
  scene.playerShots = [];
  player.hitpoints = player.maxHitpoints;
  player.attackAt = Date.now() + 600000;
  scene.enemies = [
    {
      id: 999,
      x: player.x,
      y: player.y,
      angle: 0,
      archetype: 'brute',
      hitpoints: 30,
      cooldownUntil: Date.now() + 600000,
      debuffs: [
        {
          kind: 'roots',
          stacks: 1,
          expiresAt: Date.now() + 600000,
          nextTick: Date.now() + 600000,
          ownerId: player.id,
        },
      ],
    },
  ];
  const enemy = scene.enemies[0];
  await capture('enemy-behind', enemy.x, enemy.y - 12);
  await capture('enemy-front', enemy.x, enemy.y + 12);
  await captureAbilities(scene, 'forest', enemy.x, enemy.y);
  enemy.x = 4798;
  await capture('enemy-wrapped', 2, enemy.y - 12);
  await captureAbilities(scene, 'forest-wrapped', 2, enemy.y);
  expect(errors).toEqual([]);
});
