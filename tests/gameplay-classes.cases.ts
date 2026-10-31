import { test, expect } from './fixtures';
import {
  WARDROBE,
  TRAINING_ZONES,
  CLASS_IDS,
  CLASS_LABELS,
  forestDistance,
} from '../packages/core/src/index.ts';

test('every wardrobe class trains through Colyseus, preserves health, and resumes after a transport loss', async ({
  page,
  game,
}) => {
  test.setTimeout(Math.max(test.info().timeout, 120000));
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const Native = window.WebSocket;
    window.WebSocket = class extends Native {
      constructor(url: string | URL, protocols?: string | string[]) {
        super(url, protocols);
        (window as unknown as { testSocket: WebSocket }).testSocket = this;
        const state = window as unknown as { testGeneration?: number };
        state.testGeneration = (state.testGeneration ?? 0) + 1;
      }
    };
  });
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Class tester');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const wardrobe = page.getByRole('dialog', { name: 'Wardrobe' });
  for (const classId of CLASS_IDS) {
    player.x = WARDROBE.x;
    player.y = WARDROBE.y - 15;
    await expect(
      page.getByLabel('Shared village. Move with WASD or arrow keys.', { exact: true }),
    ).toHaveAttribute('data-interaction-prompt', 'Wardrobe');
    await page.keyboard.press('e');
    await expect(wardrobe).toBeVisible();
    const choice = wardrobe.getByRole('button', { name: new RegExp(`^${CLASS_LABELS[classId]}`) });
    if ((player.classId ?? 'warrior') !== classId) await choice.click();
    await expect(choice).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => player.classId ?? 'warrior').toBe(classId);
    await wardrobe.getByRole('button', { name: 'Close Wardrobe', exact: true }).click();
    await expect(wardrobe).toBeHidden();
    if (classId === 'druid') {
      player.x = 480;
      player.y = 360;
      await expect.poll(() => forestDistance(player.bear!, player)).toBeLessThan(21);
      // Isolate companion hits from the Druid's root projectiles.
      player.attackAt = Date.now() + 60000;
    }

    world.training!.damage = [];
    world.training!.playerShots = [];
    for (const enemy of world.training!.enemies) enemy.debuffs = [];
    const previousHit = world.training!.sequence;
    player.x = TRAINING_ZONES[0].x + 65;
    player.y = TRAINING_ZONES[0].y;
    // Exercise companion combat here; forest chasing is covered below.
    if (classId === 'druid' && player.bear) {
      player.bear.x = player.x;
      player.bear.y = player.y;
    }

    // Damage records live for 800ms; 1s polling can miss every 1s companion hit.
    await expect
      .poll(() => world.training!.damage.some((hit) => hit.id > previousHit), {
        intervals: [50],
        timeout: 10000,
      })
      .toBe(true);
    await expect.poll(() => player.dps ?? 0).toBeGreaterThan(0);
    expect(player.hitpoints).toBe(player.maxHitpoints);
    expect(player.experience).toBe(0);
    if (classId === 'druid') {
      await expect.poll(() => player.bear?.name).toBe('Bear');
      await expect
        .poll(
          () =>
            world.training!.damage.some(
              (hit) => hit.damageType === 'physical' && (hit.amount === 3 || hit.amount === 4.5),
            ),
          { intervals: [50] },
        )
        .toBe(true);
      await expect
        .poll(() => forestDistance(player.bear!, world.training!.enemies[0]))
        .toBeLessThan(95);
    }

    await page.screenshot({ path: `test-results/new-training-${classId}.png` });
  }

  await page.getByRole('complementary', { name: 'World chat', exact: true }).hover();
  await page.getByLabel('Chat message', { exact: true }).fill('Same party, new runtime');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('log')).toContainText('Same party, new runtime');
  const id = player.id,
    worldId = world.id;
  const generation = await page.evaluate(
    () => (window as unknown as { testGeneration: number }).testGeneration,
  );
  await page.evaluate(() =>
    (window as unknown as { testSocket: WebSocket }).testSocket.close(4001),
  );
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { testGeneration: number }).testGeneration),
    )
    .toBeGreaterThan(generation);
  await expect(
    page.getByRole('status', { name: 'World server online', includeHidden: true }),
  ).toBeVisible({ timeout: 15000 });
  await expect.poll(() => game.runtime.worlds.get(worldId)?.players.size).toBe(1);
  expect(game.runtime.worlds.get(worldId)!.players.get(id)?.classId).toBe('druid');
  await expect(
    page
      .getByRole('article', { name: 'Class tester', exact: true })
      .locator('img[src$="druid-portrait.png"]'),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
