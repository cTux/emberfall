// Space idle captures far enough apart to sample different animation poses.
const IDLE_POSE_INTERVAL_MS = 400;
// Allow authoritative relocation and interaction outlines to reach presentation.
const RELOCATION_SETTLE_MS = 500;
import { test, expect } from './fixtures';
import { BUILDINGS, INNKEEPER } from '../packages/core/src/index.ts';

test('Marta opens shared trading while the Inn has no interaction', async ({ page, game }) => {
  const errors: string[] = [];
  const inn = BUILDINGS.find((building) => {
    return building.id === 'inn';
  })!;
  expect(INNKEEPER.x - (inn.x + inn.sourceWidth)).toBeGreaterThan(0);
  expect(INNKEEPER.x - (inn.x + inn.sourceWidth)).toBeLessThanOrEqual(24);
  expect(Math.abs(INNKEEPER.y - inn.y)).toBeLessThanOrEqual(16);
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  const marta = world.npcs!.find((npc) => {
    return npc.id === INNKEEPER.id;
  })!;
  player.x = marta.x - 70;
  player.y = marta.y - 18;
  await page.waitForTimeout(RELOCATION_SETTLE_MS);
  await page.screenshot({ path: 'test-results/innkeeper-name-inactive.png' });
  player.x = marta.x - 45;
  await page.waitForTimeout(RELOCATION_SETTLE_MS);
  await page.screenshot({ path: 'test-results/innkeeper-name-active.png' });
  Object.assign(marta, { x: 1000, y: 1000 });
  const dialog = page.getByRole('dialog', { name: INNKEEPER.name });
  await expect(async () => {
    if (await page.getByRole('dialog').count()) {
      await page.keyboard.press('Escape');
    }

    player.x = marta.x;
    player.y = marta.y - 15;
    await page.keyboard.press('e');
    await expect(dialog).toBeVisible({ timeout: 1000 });
  }).toPass({ intervals: [200], timeout: 6000 });
  await expect(dialog.getByRole('region', { name: "Innkeeper's backpack" })).toBeVisible();
  await expect(dialog.getByLabel("Innkeeper's backpack: 5000 coins")).toBeVisible();
  await page.screenshot({ path: 'test-results/innkeeper-placeholder.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await page.screenshot({ path: 'test-results/innkeeper-idle.png' });

  for (let frame = 0; frame < 4; frame++) {
    await page.waitForTimeout(IDLE_POSE_INTERVAL_MS);
    await page.screenshot({
      path: `test-results/innkeeper-idle-${frame}.png`,
      clip: { x: 685, y: 365, width: 70, height: 70 },
    });
  }

  // Keep the roaming trader from taking priority over the building interactions below.
  Object.assign(marta, { x: 1000, y: 1000 });
  player.x = inn.doorX;
  player.y = inn.y + 9;
  // Allow the confirmed relocation to reach presentation before testing E.
  await page.waitForTimeout(RELOCATION_SETTLE_MS);
  await page.keyboard.press('e');
  await expect(page.getByRole('dialog')).toBeHidden();
  const hall = BUILDINGS.find((building) => {
    return building.id === 'hall';
  })!;
  player.x = hall.doorX;
  player.y = hall.y + 9;
  await expect(async () => {
    if (await page.getByRole('dialog').count()) {
      await page.keyboard.press('Escape');
    }

    await page.keyboard.press('e');
    await expect(page.getByRole('dialog', { name: hall.name })).toBeVisible({ timeout: 1000 });
  }).toPass({ intervals: [200], timeout: 6000 });
  expect(errors).toEqual([]);
});
