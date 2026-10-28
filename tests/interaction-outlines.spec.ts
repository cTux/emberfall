import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { test, expect } from './fixtures';
import {
  BUILDINGS,
  WARDROBE,
  FOREST,
  LOBBY_PORTAL,
  wrappedDelta,
} from '../packages/core/src/index.ts';

const require = createRequire(resolve('packages/client/package.json'));
const sharp =
  require('sharp') as typeof import('../packages/client/node_modules/sharp/lib/index.js');

for (const graphicsPreset of ['Low', 'High'] as const) {
  test.describe(graphicsPreset, () => {
    test.use({ graphicsPreset });
    test('hover outlines stay thin and clicks share E interactions', async ({ page, game }) => {
      test.setTimeout(180000);
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
      await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
      const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
      const player = [...world.players.values()][0];
      const canvas = page.locator('canvas');
      const scale = Math.max(1440 / 960, 1000 / 640);
      const closeDialog = async () => {
        const dialog = page.getByRole('dialog');
        await dialog.getByRole('button', { name: /^Close / }).click();
        await expect(dialog).toBeHidden();
      };
      const hover = async (x: number, y: number, id: string, inRange: boolean) => {
        await expect(async () => {
          await page.mouse.move(
            720 + wrappedDelta(x, player.x, FOREST.width) * scale,
            500 + wrappedDelta(y, player.y, FOREST.height) * scale,
          );
          await expect(canvas).toHaveAttribute('data-interaction-target', id);
          await expect(canvas).toHaveAttribute('data-interaction-range', String(inRange));
        }).toPass();
      };
      const yellowPixels = async (name: string) => {
        const image = await canvas.screenshot({
          path: `test-results/${graphicsPreset}-${name}.png`,
        });
        const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
        let count = 0;
        for (let i = 0; i < data.length; i += info.channels)
          if (data[i] > 220 && data[i + 1] > 180 && data[i + 2] < 45) count++;
        return count;
      };
      const greenPixels = async (name: string) => {
        const image = await canvas.screenshot({
          path: `test-results/${graphicsPreset}-${name}.png`,
        });
        const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
        let count = 0;
        for (let i = 0; i < data.length; i += info.channels)
          if (data[i + 1] > 70 && data[i] < data[i + 1] * 0.18 && data[i + 2] < data[i + 1] * 0.18)
            count++;
        return count;
      };
      const altDefaultsPrevented = async (code: string, type: 'keydown' | 'keyup') =>
        page.evaluate(
          ({ code, type }) =>
            !window.dispatchEvent(
              new KeyboardEvent(type, {
                key: 'Alt',
                code,
                bubbles: true,
                cancelable: true,
              }),
            ),
          { code, type },
        );
      player.x = WARDROBE.x - 120;
      player.y = WARDROBE.y + 9;
      await hover(WARDROBE.x, WARDROBE.y - 30, 'wardrobe', false);
      await expect(canvas).toHaveAttribute('data-interaction-prompt', '');
      const thin = await yellowPixels('wardrobe-out-of-range');
      expect(thin).toBeGreaterThan(20);
      const normalGreen = await greenPixels('alt-released');
      expect(await altDefaultsPrevented('AltLeft', 'keydown')).toBe(true);
      await expect.poll(() => greenPixels('alt-village')).toBeGreaterThan(normalGreen + 100);
      expect(await altDefaultsPrevented('AltRight', 'keydown')).toBe(true);
      expect(await altDefaultsPrevented('AltLeft', 'keyup')).toBe(true);
      await expect.poll(() => greenPixels('alt-right-village')).toBeGreaterThan(normalGreen + 100);
      expect(await altDefaultsPrevented('AltRight', 'keyup')).toBe(true);
      await expect.poll(() => greenPixels('alt-released-again')).toBeLessThan(normalGreen + 20);
      await page.keyboard.down('Alt');
      await expect.poll(() => greenPixels('alt-before-blur')).toBeGreaterThan(normalGreen + 100);
      await page.evaluate(() => window.dispatchEvent(new Event('blur')));
      await expect.poll(() => greenPixels('alt-after-blur')).toBeLessThan(normalGreen + 20);
      await page.keyboard.up('Alt');

      await page.mouse.click(720 + 120 * scale, 500 - 39 * scale);
      await page.keyboard.press('e');
      await expect(page.getByRole('dialog')).toBeHidden();

      player.x = WARDROBE.x - 35;
      await hover(WARDROBE.x, WARDROBE.y - 30, 'wardrobe', true);
      await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Wardrobe');
      await page.mouse.move(0, 0);
      await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Wardrobe');
      const chat = page.getByRole('textbox', { name: 'Chat message' });
      await page.keyboard.press('Enter');
      await expect(chat).toBeFocused();
      expect(
        await chat.evaluate((input) =>
          input.dispatchEvent(
            new KeyboardEvent('keydown', {
              key: '@',
              code: 'KeyQ',
              altKey: true,
              ctrlKey: true,
              bubbles: true,
              cancelable: true,
            }),
          ),
        ),
      ).toBe(true);
      await page.keyboard.down('Alt');
      const chatGreen = await greenPixels('alt-chat');
      await page.keyboard.up('Alt');
      expect(await greenPixels('released-chat')).toBeLessThan(chatGreen + 20);

      await expect(canvas).toHaveAttribute('data-interaction-prompt', '');
      await chat.blur();
      await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Wardrobe');
      await hover(WARDROBE.x, WARDROBE.y - 30, 'wardrobe', true);
      const nearby = await yellowPixels('wardrobe-in-range');
      expect(nearby).toBeGreaterThan(20);
      expect(nearby).toBeLessThan(thin * 1.5);
      await page.mouse.down();
      await page.mouse.up();
      const wardrobe = page.getByRole('dialog', { name: 'Wardrobe' });
      await expect(wardrobe).toBeVisible();
      await expect(canvas).toHaveAttribute('data-interaction-prompt', '');
      await expect(canvas).toHaveAttribute('data-interaction-target', '');
      await closeDialog();
      await hover(WARDROBE.x, WARDROBE.y - 30, 'wardrobe', true);
      await page.keyboard.press('e');
      await expect(wardrobe).toBeVisible();
      await closeDialog();

      const hall = BUILDINGS.find((b) => b.id === 'hall')!;
      player.x = hall.doorX;
      player.y = hall.y + 9;
      await hover(hall.x, hall.y - 40, 'hall', true);
      await expect(canvas).toHaveAttribute('data-interaction-prompt', hall.name);
      await page.mouse.down();
      await page.mouse.up();
      await expect(page.getByRole('dialog', { name: hall.name })).toBeVisible();
      await closeDialog();

      const marta = world.npcs!.find((npc) => npc.id === 'innkeeper')!;
      await expect(async () => {
        player.x = marta.x - 35;
        player.y = marta.y + 9;
        await hover(marta.x, marta.y - 24, 'innkeeper', true);
        await expect(canvas).toHaveAttribute('data-interaction-prompt', marta.name);
        await page.mouse.down();
        await page.mouse.up();
        await expect(page.getByRole('dialog', { name: marta.name })).toBeVisible();
      }).toPass();
      await closeDialog();

      player.x = LOBBY_PORTAL.x - 35;
      player.y = LOBBY_PORTAL.y + 9;
      await hover(LOBBY_PORTAL.x, LOBBY_PORTAL.y - 30, 'portal', true);
      await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Forest portal');
      await page.mouse.down();
      await page.mouse.up();
      await expect(page.getByRole('dialog', { name: 'Forest portal' })).toBeVisible();
      await closeDialog();

      // Isolate a completed forest with its portal across the horizontal seam.
      game.runtime.parties(world).run([...world.players.values()][0]).scene = {
        ...world.training!,
        id: 'outline-forest',
        electorate: '',
        training: false,
        phase: 'ended',
        enemies: [],
        portals: [{ x: FOREST.width - 12, y: 300 }],
      };
      player.scene = 'forest';
      player.x = 110;
      player.y = 300;
      await expect(canvas).toHaveAttribute('aria-label', 'Forest combat scene.');
      await hover(FOREST.width - 12, 270, 'return', false);
      await expect(canvas).toHaveAttribute('data-interaction-prompt', '');
      const portalThin = await yellowPixels('forest-out-of-range');
      expect(portalThin).toBeGreaterThan(20);
      const forestGreen = await greenPixels('forest-alt-released');
      await page.keyboard.down('Alt');
      await expect.poll(() => greenPixels('alt-forest-seam')).toBeGreaterThan(forestGreen + 100);
      await page.keyboard.up('Alt');
      await expect.poll(() => greenPixels('forest-alt-release')).toBeLessThan(forestGreen + 20);

      await page.mouse.down();
      await page.mouse.up();
      expect(player.scene).toBe('forest');
      player.x = 12;
      await hover(FOREST.width - 12, 270, 'return', true);
      await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Return to village');
      const portalNearby = await yellowPixels('forest-in-range');
      expect(portalNearby).toBeGreaterThan(10);
      expect(portalNearby).toBeLessThan(portalThin * 1.5);
      await page.mouse.down();
      await page.mouse.up();
      await expect.poll(() => player.scene).toBeUndefined();
      player.hitpoints = 0;
      await expect(canvas).toHaveAttribute('data-interaction-prompt', '');
      expect(errors).toEqual([]);
    });
  });
}

test('Alt outlines party candidates without changing E interaction', async ({
  page,
  browser,
  game,
}) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  try {
    const other = await context.newPage();
    for (const [client, name] of [
      [page, 'Alpha'],
      [other, 'Bravo'],
    ] as const) {
      await client.goto('/');
      await client.getByLabel('Your adventurer name').fill(name);
      await client.getByRole('button', { name: /^Join Playtest Default/ }).click();
      await expect(client.getByRole('button', { name: 'Leave world' })).toBeVisible();
    }
    const world = [...game.runtime.worlds.values()].find((w) => w.players.size === 2)!;
    const a = [...world.players.values()].find((p) => p.name === 'Alpha')!;
    const b = [...world.players.values()].find((p) => p.name === 'Bravo')!;
    a.x = 1800;
    a.y = 1800;
    b.x = 1830;
    b.y = 1800;
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Invite to party');
    const candidateGreen = async () => {
      const image = await page.screenshot({ clip: { x: 745, y: 445, width: 50, height: 90 } });
      const { data, info } = await sharp(image).raw().toBuffer({ resolveWithObject: true });
      let count = 0;
      for (let i = 0; i < data.length; i += info.channels)
        if (data[i + 1] > 70 && data[i] < data[i + 1] * 0.18 && data[i + 2] < data[i + 1] * 0.18)
          count++;
      return count;
    };
    const before = await candidateGreen();
    await page.keyboard.down('Alt');
    await expect.poll(candidateGreen).toBeGreaterThan(before + 20);
    await canvas.screenshot({ path: 'test-results/alt-party-player.png' });
    await page.keyboard.up('Alt');
    await expect.poll(candidateGreen).toBeLessThan(before + 10);
    await page.keyboard.press('e');
    await expect(other.locator('canvas')).toHaveAttribute('data-interaction-prompt', 'Accept');
  } finally {
    await context.close();
  }
});
