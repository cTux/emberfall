import { test, expect } from './fixtures';
import {
  CLASS_IDS,
  TRAINING_ZONES,
  starterEquipment,
  learnTalent,
  equipTalent,
  talentNodeId,
} from '../packages/core/src/index.ts';
import { classDetails } from '../packages/client/src/class-details';

test('action bar slots follow custom cursor size and native fallback', async ({ page, game }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.level = 20;
  const nodeId = talentNodeId('warrior', 0, 1);
  learnTalent(player, nodeId);
  equipTalent(player, 0, nodeId);
  const bar = page.getByRole('region', { name: 'Action bar', exact: true });
  const ability = bar.getByRole('button', { name: 'Choose ability for slot 1: Cleaving Strike' });
  await expect(ability).toBeVisible();
  for (const size of [32, 48, 64, null]) {
    await page.locator('body').evaluate((body, size) => {
      body.dataset.customCursor = String(size !== null);
      if (size !== null) body.dataset.cursorSize = String(size);
    }, size);
    for (const slot of [ability, bar.getByRole('button', { name: 'Empty ability slot 2' })]) {
      await slot.hover();
      await expect(slot).toHaveCSS(
        'cursor',
        size === null ? 'pointer' : new RegExp(`/${size}/pointer\\.png`),
      );
    }
    await expect(bar.getByRole('group', { name: 'Slash', exact: true })).toHaveCSS(
      'cursor',
      size === null ? 'default' : new RegExp(`/${size}/default\\.png`),
    );
  }
  await page.screenshot({ path: 'test-results/action-bar-cursors.png' });
});

test('action bar follows confirmed training and forest attacks, equipment and viewport', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await expect(page.getByRole('region', { name: 'Action bar', exact: true })).toHaveCount(0);
  await page.getByLabel('Your adventurer name').fill('Action bar tester');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const bar = page.getByRole('region', { name: 'Action bar', exact: true });
  await expect(bar).toBeVisible();
  await bar.getByRole('group', { name: 'Slash', exact: true }).hover();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toContainText('Cooldown:');
  await expect(tooltip).toContainText(classDetails.warrior.spellDescription);
  await expect(tooltip).not.toContainText(/Left mouse|Auto-/);
  await page.mouse.move(0, 0);
  const fire = bar.getByRole('img', { name: /^Left mouse button/ });
  const target = bar.getByRole('img', { name: /^Auto-target/ });
  await expect(fire).toHaveAttribute('data-active', 'true');
  await expect(target).toHaveAttribute('data-active', 'true');
  await page.keyboard.press('g');
  await expect(target).toHaveAttribute('data-active', 'false');
  await expect(fire).toHaveAttribute('data-active', 'true');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Auto-target (G)', { exact: true }).check();
  await page.getByLabel('Auto-attack (F)', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect(target).toHaveAttribute('data-active', 'true');
  await expect(fire).toHaveAttribute('data-active', 'false');
  await page.reload();
  await expect(bar).toBeVisible();
  await expect(target).toHaveAttribute('data-active', 'true');
  await expect(fire).toHaveAttribute('data-active', 'false');
  await page.keyboard.press('f');
  await expect(fire).toHaveAttribute('data-active', 'true');
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  const names = { warrior: 'Slash', ranger: 'Piercing arrows', mage: 'Fireball', druid: 'Roots' };
  for (const classId of CLASS_IDS) {
    player.classId = classId;
    player.equipment = starterEquipment(classId);
    await expect(
      bar.getByRole('group', {
        name: names[classId as 'warrior' | 'ranger' | 'mage' | 'druid'],
        exact: true,
      }),
    ).toBeVisible();
    await expect(bar.getByRole('group')).toHaveCount(1);
    await expect(bar.getByRole('button', { name: /^Empty ability slot/ })).toHaveCount(4);
    await expect(bar.locator('img')).toHaveAttribute(
      'src',
      `/assets/wardrobe-style/${classId}-spell.png`,
    );
    await expect
      .poll(() => bar.locator('img').evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);
    await bar.screenshot({ path: `test-results/action-bar-${classId}.png` });
  }
  player.classId = 'warrior';
  player.equipment = starterEquipment('warrior');
  player.x = TRAINING_ZONES[0].x + 65;
  player.y = TRAINING_ZONES[0].y;
  const cooldown = bar.getByRole('progressbar', { name: 'Slash cooldown' });
  await expect(cooldown).toBeVisible();
  expect(player.attackAt).toBeDefined();
  await expect(cooldown).toHaveAttribute('aria-valuemax', '1000');
  await page.keyboard.press('f');
  await expect.poll(() => player.autoAttack).toBe(false);
  await expect(fire).toHaveAttribute('data-active', 'false');
  await expect(cooldown).toHaveCount(0);
  // A manual cast traverses the real SDK/server path and restarts the display.
  const previousAttack = player.attackAt!;
  await page.mouse.move(850, 500);
  await page.mouse.down();
  await expect.poll(() => player.attackAt!).toBeGreaterThan(previousAttack);
  await expect(cooldown).toBeVisible();
  await page.mouse.up();
  await expect(cooldown).toHaveCount(0);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    const bounds = (await bar.boundingBox())!;
    expect(Math.abs(bounds.x + bounds.width / 2 - viewport.width / 2)).toBeLessThan(1);
    expect(bounds.y + bounds.height).toBe(viewport.height - 16);
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    const empty = bar.getByRole('button', { name: 'Empty ability slot 1', exact: true });
    await expect(empty).toHaveCSS('background-color', 'rgba(0, 0, 0, 0.76)');
    await expect(empty).toHaveCSS('border-top', '1px solid rgb(135, 80, 57)');
    if (viewport.width === 320) {
      const chat = (await page
        .getByRole('complementary', { name: 'World chat', exact: true })
        .boundingBox())!;
      expect(chat.y + chat.height).toBeLessThan(bounds.y);
    }
    await page.screenshot({ path: `test-results/action-bar-${viewport.width}.png` });
  }
  player.equipment = {};
  await expect(bar.getByRole('group')).toHaveCount(0);
  await expect(bar.locator('img')).toHaveCount(0);
  player.equipment = starterEquipment('warrior');
  await expect(bar.getByRole('group')).toHaveCount(1);

  game.runtime.parties(world).run([...world.players.values()][0]).scene = {
    ...world.training!,
    id: 'action-bar-forest',
    electorate: '',
    training: false,
    enemies: [],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
  };
  player.scene = 'forest';
  await page.keyboard.press('f');
  await expect.poll(() => player.autoAttack).toBe(true);
  await expect(fire).toHaveAttribute('data-active', 'true');
  await expect(cooldown).toBeVisible();
  await page.screenshot({ path: 'test-results/action-bar-forest.png' });
  player.equipment = {};
  await expect(bar.getByRole('group')).toHaveCount(0);
  await expect(bar.getByRole('progressbar')).toHaveCount(0);
});
