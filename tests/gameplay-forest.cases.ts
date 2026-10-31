import { test, expect } from './fixtures';
import { LOBBY_PORTAL, starterEquipment } from '../packages/core/src/index.ts';

test('bear chases and defeats a forest boss after portal entry, opening the return portal', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.classId = 'druid';
  player.equipment = starterEquipment('druid');
  player.attackAt = Date.now() + 60000;
  player.x = LOBBY_PORTAL.x;
  player.y = LOBBY_PORTAL.y - 15;
  const portal = page.getByRole('dialog', { name: 'Forest portal' });
  await expect(
    page.getByLabel('Shared village. Move with WASD or arrow keys.', { exact: true }),
  ).toHaveAttribute('data-interaction-prompt', 'Forest portal', { timeout: 15000 });
  await page.keyboard.press('e');
  await expect(portal).toBeVisible();
  await portal.getByRole('button', { name: 'Create', exact: true }).click();
  await portal.getByRole('button', { name: "I'm ready" }).click();
  await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
  expect(game.runtime.parties(world).run([...world.players.values()][0]).scene?.phase).toBe(
    'active',
  );
  await page.screenshot({ path: 'test-results/new-forest-combat.png' });
  const scene = game.runtime.parties(world).run([...world.players.values()][0]).scene!;
  player.attackAt = Date.now() + 60000;
  scene.playerShots = [];
  const id = ++scene.sequence;
  scene.bossId = id;
  scene.enemies = [
    {
      id,
      x: player.x + 40,
      y: player.y,
      angle: 0,
      archetype: 'brute',
      kind: 'boss',
      name: 'The Hollow Warden',
      hitpoints: 2,
      maxHitpoints: 200,
    },
  ];
  await expect.poll(() => scene.phase).toBe('ended');
  await expect(page.getByText('Scene complete · Return portal open')).toBeVisible();
  expect(scene.portals.length).toBeGreaterThan(0);
  await page.screenshot({ path: 'test-results/new-forest-return.png' });
  await expect(page.getByLabel('Forest combat scene.', { exact: true })).toHaveAttribute(
    'data-interaction-prompt',
    'Return to village',
    { timeout: 15000 },
  );
  await page.keyboard.press('e');
  await expect(page.getByLabel('Shared village. Move with WASD or arrow keys.')).toBeVisible();
  expect(player.scene).toBeUndefined();
  expect(player.hitpoints).toBe(player.maxHitpoints);
  expect(errors).toEqual([]);
});

for (const [difficulty, multiplier] of [
  ['Medium', 2],
  ['Hard', 4],
] as const) {
  test(`portal creates and regenerates ${difficulty} scenes`, async ({ page, game }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
    await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
    const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
    const player = [...world.players.values()][0];
    player.autoAttack = false;
    player.x = LOBBY_PORTAL.x;
    player.y = LOBBY_PORTAL.y - 15;
    const portal = page.getByRole('dialog', { name: 'Forest portal' });
    await expect(
      page.getByLabel('Shared village. Move with WASD or arrow keys.', { exact: true }),
    ).toHaveAttribute('data-interaction-prompt', 'Forest portal', { timeout: 15000 });
    await page.keyboard.press('e');
    await expect(portal).toBeVisible();
    await expect(portal.getByRole('combobox', { name: 'Difficulty' })).toHaveText('Easy');
    await portal.getByRole('combobox', { name: 'Difficulty' }).click();
    for (const name of ['Easy', 'Medium', 'Hard'])
      await expect(page.getByRole('option', { name, exact: true })).toBeVisible();
    await page.getByRole('option', { name: difficulty, exact: true }).click();
    await expect(portal.getByText(`${multiplier}× enemy health and damage`)).toBeVisible();
    await page.screenshot({ path: `test-results/portal-${difficulty.toLowerCase()}.png` });
    await portal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect
      .poll(() => game.runtime.parties(world).run([...world.players.values()][0]).scene?.difficulty)
      .toBe(difficulty);
    await expect(
      portal.getByRole('heading', { name: new RegExp(`^Forest · ${difficulty}`) }),
    ).toBeVisible();
    await portal.getByRole('button', { name: "I'm ready" }).click();
    await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
    const sceneId = game.runtime.parties(world).run([...world.players.values()][0]).scene!.id;
    player.scene = undefined;
    player.x = LOBBY_PORTAL.x;
    player.y = LOBBY_PORTAL.y - 15;
    await expect(
      page.getByLabel('Shared village. Move with WASD or arrow keys.', { exact: true }),
    ).toHaveAttribute('data-interaction-prompt', 'Forest portal', { timeout: 15000 });
    await page.keyboard.press('e');
    await expect(portal.getByRole('button', { name: 'Regenerate scene' })).toBeVisible();
    await portal.getByRole('button', { name: 'Regenerate scene' }).click();
    await expect
      .poll(() => game.runtime.parties(world).run([...world.players.values()][0]).scene!.id)
      .not.toBe(sceneId);
    expect(game.runtime.parties(world).run([...world.players.values()][0]).scene!.difficulty).toBe(
      difficulty,
    );
    await expect(
      portal.getByRole('heading', { name: new RegExp(`^Forest · ${difficulty}`) }),
    ).toBeVisible();
  });
}
