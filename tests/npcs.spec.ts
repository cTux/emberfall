import { test, expect } from './fixtures';
import type { DialogueResult } from '../packages/server/src/npc-models.ts';
let response: DialogueResult = { status: 'unavailable' };
test.use({ npcDialogue: { generate: async () => response } });

test('Marta walks near a player, stops for trading, and resumes when the window closes', async ({
  page,
  game,
}) => {
  response = { status: 'busy' };
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.locator('canvas').first()).toHaveAttribute('data-npcs', '4');
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  const marta = world.npcs!.find((npc) => npc.id === 'innkeeper')!;
  Object.assign(marta, { x: 1000, y: 1000 });
  Object.assign(player, { x: 1000, y: 985 });
  await expect.poll(() => marta.moving, { timeout: 12_000 }).toBe(true);
  await page.keyboard.press('e');
  const trading = page.getByRole('dialog', { name: marta.name });
  await expect(trading).toBeVisible();
  await expect.poll(() => marta.moving).toBe(false);
  const stopped = { x: marta.x, y: marta.y };
  await expect(
    page.getByRole('button', { name: `Close ${marta.name}`, exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(trading).not.toBeVisible();
  await expect.poll(() => marta.moving).toBe(true);
  await expect.poll(() => Math.hypot(marta.x - stopped.x, marta.y - stopped.y)).toBeGreaterThan(2);
});

test('LLM outage gives every villager a visible silence debuff and one red village announcement', async ({
  page,
  game,
}) => {
  response = { status: 'unavailable' };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toHaveAttribute('data-npcs', '4');
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  player.x = 300;
  player.y = 260;
  const warning = page.getByText(
    'The villagers have been silenced. Their voices will return soon.',
    { exact: false },
  );
  await expect(warning).toBeVisible({ timeout: 18_000 });
  await expect(canvas).toHaveAttribute('data-silenced-npcs', '4');
  await expect(page.locator('.chat-danger')).toHaveCSS('color', 'rgb(255, 135, 148)');
  await page.screenshot({ path: 'test-results/npc-silence.png' });
  expect(world.chat!.filter((m) => m.tone === 'danger')).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('players can address Marta, see her answer, and watch her walk after leaving trading range', async ({
  page,
  game,
}) => {
  response = { status: 'ok', text: 'Welcome! Have you met our neighbours?' };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  player.x = 300;
  player.y = 260;
  await expect(page.locator('canvas').first()).toHaveAttribute('data-npcs', '4');
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Chat message' }).fill('@Marta Hello!');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('log')).toContainText(
    'Marta the Innkeeper: Welcome! Have you met our neighbours?',
  );
  await page.screenshot({ path: 'test-results/npc-conversation.png' });
  const marta = world.npcs!.find((n) => n.id === 'innkeeper')!;
  player.x = 445;
  player.y = 350;
  const start = { x: marta.x, y: marta.y };
  await expect
    .poll(() => Math.hypot(marta.x - start.x, marta.y - start.y), { timeout: 12_000 })
    .toBeGreaterThan(5);
  for (let frame = 0; frame < 4; frame++) {
    await page.screenshot({ path: `test-results/npc-walking-${frame}.png` });
    await page.waitForTimeout(160);
  }
  expect(errors).toEqual([]);
});

test('eight home workstations render and Marta switches from work to trading and speech, then back', async ({
  page,
  game,
}) => {
  test.setTimeout(120_000);
  response = { status: 'ok', text: 'The soup is almost ready!' };
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const canvas = page.locator('canvas').first();
  await expect(canvas).toHaveAttribute('data-workstations', '8');
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  const marta = world.npcs!.find((n) => n.id === 'innkeeper')!;
  // Let the real scheduler walk her home; minute-long timing is covered with explicit Node-test clocks.
  await expect.poll(() => marta.workstationId, { timeout: 85_000 }).toBe('inn-cooking');
  await expect(canvas).toHaveAttribute('data-working-npc-ids', /innkeeper/);
  await page.screenshot({ path: 'test-results/npc-workstations-overview.png' });
  Object.assign(player, { x: marta.x + 45, y: marta.y - 15 });
  await expect(canvas).not.toHaveAttribute('data-working-npcs', '0');
  await page.screenshot({ path: 'test-results/npc-workstations.png' });
  await page.keyboard.press('e');
  const trading = page.getByRole('dialog', { name: marta.name });
  await expect(trading).toBeVisible();
  await expect.poll(() => marta.workstationId).toBeUndefined();
  await expect(canvas).not.toHaveAttribute('data-working-npc-ids', /innkeeper/);
  await page.keyboard.press('Escape');
  await expect(trading).not.toBeVisible();
  await expect.poll(() => marta.workstationId).toBe('inn-cooking');
  await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Chat message' }).fill('@Marta What are you cooking?');
  await page.keyboard.press('Enter');
  await expect.poll(() => marta.workstationId).toBeUndefined();
  await expect(canvas).not.toHaveAttribute('data-working-npc-ids', /innkeeper/);
  await expect(page.getByRole('log')).toContainText('The soup is almost ready!');
  await page.screenshot({ path: 'test-results/npc-work-interrupted.png' });
  await expect.poll(() => marta.workstationId, { timeout: 15_000 }).toBe('inn-cooking');
  await expect(canvas).toHaveAttribute('data-working-npc-ids', /innkeeper/);
  await page.screenshot({ path: 'test-results/npc-work-resumed.png' });
  expect(errors).toEqual([]);
});
