import { test, expect } from './fixtures';
import { LOBBY_PORTAL, experienceRequired } from '../packages/core/src/index.ts';

test('XP bar follows authoritative leveling and saved paragon after rejoining', async ({
  page,
  game,
}, testInfo) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('XP hero');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const card = page.getByRole('article', { name: 'XP hero', exact: true });
  const xp = card.getByRole('progressbar', { name: 'XP hero XP', exact: true });
  await expect(xp).toHaveAttribute('aria-valuetext', '0 / 50');
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.x = LOBBY_PORTAL.x;
  player.y = LOBBY_PORTAL.y - 15;
  await expect(page.locator('canvas')).toHaveAttribute('data-interaction-prompt', 'Forest portal');
  await page.keyboard.press('e');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await page.getByRole('button', { name: "I'm ready" }).click();
  await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
  game.runtime.parties(world).run([...world.players.values()][0]).scene!.nextSpawn = 1e15;
  game.runtime.parties(world).run([...world.players.values()][0]).scene!.enemies = [];
  game.runtime.parties(world).run([...world.players.values()][0]).scene!.spawns = [];
  player.experience = 49;
  game.runtime.parties(world).run([...world.players.values()][0]).scene!.drops = [
    {
      id: ++game.runtime.parties(world).run([...world.players.values()][0]).scene!.sequence,
      kind: 'experience',
      amount: 2.5,
      x: player.x,
      y: player.y,
      at: Date.now() - 300,
    },
  ];
  await expect(xp).toHaveAttribute('aria-valuetext', '1.5 / 100');
  await expect(
    card.getByRole('progressbar', { name: 'XP hero, lvl 2', exact: true }),
  ).toBeVisible();
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const health = await card
      .getByRole('progressbar', { name: 'XP hero, lvl 2', exact: true })
      .boundingBox();
    const experience = await xp.boundingBox();
    expect(experience!.y).toBeGreaterThanOrEqual(health!.y + health!.height);
    expect(experience!.height).toBeLessThan(health!.height);
    await page.screenshot({ path: testInfo.outputPath(`xp-forest-${width}.png`) });
  }

  player.level = 20;
  player.paragon = 1;
  player.experience = experienceRequired(20, 1) + 12;
  await expect(xp).toHaveAttribute('aria-valuetext', `12 / ${experienceRequired(20, 2)}`);
  expect(player.paragon).toBe(2);
  await page.getByRole('button', { name: 'Leave world' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await expect(page.getByLabel('Shared village. Move with WASD or arrow keys.')).toBeVisible();
  await page.getByRole('button', { name: 'Leave world' }).click();
  await page.getByRole('button', { name: 'Leave', exact: true }).click();
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(xp).toHaveAttribute('aria-valuetext', `12 / ${experienceRequired(20, 2)}`);
  await expect(
    card.getByRole('progressbar', { name: 'XP hero, lvl 20, P2', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('xp-restored-village.png') });
});
