import { test, expect } from './fixtures';
import { TRAINING_ZONES, starterEquipment } from '../packages/core/src/index.ts';

import './gameplay-classes.cases.ts';
import './gameplay-forest.cases.ts';
test('mage auto-cast waits outside spell range and damages the dummy after approaching', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.classId = 'mage';
  player.equipment = starterEquipment('mage');
  player.attackAt = undefined;
  const zone = TRAINING_ZONES[0];
  player.x = zone.x + 260;
  player.y = zone.y;
  const settledAt = Date.now();
  await expect
    .poll(() => {
      return world.training!.nextSpawn;
    })
    .toBeGreaterThan(settledAt + 1000);
  expect(player.attackAt).toBeUndefined();
  expect(world.training!.playerShots?.length ?? 0).toBe(0);
  expect(player.dps ?? 0).toBe(0);
  await page.screenshot({ path: 'test-results/mage-waiting-outside-range.png' });
  player.x = zone.x + 220;
  await expect
    .poll(
      () => {
        return world.training!.playerShots?.some((shot) => {
          return shot.ownerId === player.id;
        });
      },
      {
        intervals: [20],
      },
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/mage-projectiles-in-range.png' });
  await expect
    .poll(
      () => {
        return player.dps ?? 0;
      },
      { intervals: [50] },
    )
    .toBeGreaterThan(0);
  expect(player.experience).toBe(0);
  expect(player.hitpoints).toBe(player.maxHitpoints);
});

test('druid roots visibly bounce through authoritative training with one refreshed stack', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Root tester');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  player.classId = 'druid';
  player.equipment = starterEquipment('druid');
  const zone = TRAINING_ZONES[1];
  player.x = zone.x - 120;
  player.y = zone.y;
  if (player.bear) {
    player.bear.hitpoints = 0;
    player.bear.resurrectAt = Date.now() + 60000;
  }

  await expect
    .poll(
      () => {
        return world.training!.playerShots!.some((shot) => {
          return shot.kind === 'roots' && shot.hitIds.length === 3;
        });
      },
      { intervals: [20] },
    )
    .toBe(true);
  await page.screenshot({ path: 'test-results/druid-bounce-in-flight.png' });
  await expect
    .poll(
      () => {
        return world.training!.enemies.filter((enemy) => {
          return enemy.debuffs?.some((d) => {
            return d.kind === 'roots';
          });
        }).length;
      },
      { intervals: [50] },
    )
    .toBeGreaterThanOrEqual(4);
  for (const enemy of world.training!.enemies) {
    for (const debuff of enemy.debuffs ?? []) {
      if (debuff.kind !== 'roots') {
        continue;
      }

      expect(debuff.stacks).toBe(1);
      expect(debuff.expiresAt - Date.now()).toBeGreaterThan(3500);
      expect(debuff.expiresAt - Date.now()).toBeLessThanOrEqual(5000);
    }
  }

  expect(player.experience).toBe(0);
  expect(world.training!.drops?.length ?? 0).toBe(0);
  await page.screenshot({ path: 'test-results/druid-bounce-training.png' });
});
