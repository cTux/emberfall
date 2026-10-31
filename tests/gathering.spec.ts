import { test, expect } from './fixtures';
import {
  VILLAGE_RESOURCES,
  PLANT_KINDS,
  itemDefinition,
  inTrainingZone,
} from '../packages/core/src/index.ts';

import './gathering-actions.cases.ts';
import './gathering-preferences.cases.ts';
test('gathering indicator advances smoothly across snapshots', async ({ page, game }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  const node = VILLAGE_RESOURCES.find((n) => n.kind === 'plant')!;
  Object.assign(player, { x: node.x, y: node.y - 15 });
  const canvas = page.locator('canvas');
  await page.mouse.move(-1, -1);
  await expect(canvas).toHaveAttribute('data-resource', node.id);
  await page.keyboard.press('e');
  await expect(canvas).toHaveAttribute('data-gathering', node.id);
  const errors = await canvas.evaluate(
    (canvas) =>
      new Promise<number[]>((resolve) => {
        const errors: number[] = [];
        let lastTime = 0;
        let lastIndicator = 0;
        let start = 0;
        function sample(now: number) {
          const indicator = Number(canvas.dataset.gatheringIndicator);
          if (!start) start = now;
          // Ignore the sweep's direction changes; compare motion within either leg.
          if (
            lastTime &&
            indicator > 0.1 &&
            indicator < 0.9 &&
            lastIndicator > 0.1 &&
            lastIndicator < 0.9
          )
            errors.push(Math.abs(Math.abs(indicator - lastIndicator) * 1200 - (now - lastTime)));
          lastTime = now;
          lastIndicator = indicator;
          if (now - start < 2000) requestAnimationFrame(sample);
          else resolve(errors);
        }
        requestAnimationFrame(sample);
      }),
  );
  console.log('Gathering animation clock error (ms)', {
    frames: errors.length,
    maximum: Math.max(...errors),
  });
  expect(errors.length).toBeGreaterThan(20);
  expect(Math.max(...errors)).toBeLessThan(8);
});

test('each village plant appears in inventory with its own name and artwork after gathering', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  const canvas = page.locator('canvas');
  await page.mouse.move(-1, -1);
  for (const [variant, itemId] of PLANT_KINDS.entries()) {
    const node = VILLAGE_RESOURCES.find((n) => n.kind === 'plant' && n.variant === variant)!;
    Object.assign(player, { x: node.x, y: node.y - 15 });
    await expect(canvas).toHaveAttribute('data-resource', node.id);
    await expect(canvas).toHaveAttribute(
      'data-interaction-prompt',
      inTrainingZone(player) ? '' : 'Gather plant',
    );
    await page.keyboard.press('e');
    await expect(canvas).toHaveAttribute('data-gathering', node.id);
    expect(world.resources?.[node.id]).toBeUndefined();
    await expect.poll(() => world.resources?.[node.id]?.remaining, { timeout: 7000 }).toBe(0);
    expect(player.backpack!.find((item) => item.itemId === itemId)?.quantity).toBe(1);
    await page.getByRole('button', { name: 'Inventory' }).click();
    const inventory = page.getByRole('dialog', { name: 'Inventory', exact: true });
    const slot = inventory.getByRole('button', {
      name: `Use ${itemDefinition(itemId).name}`,
      exact: true,
    });
    await expect(slot).toBeVisible();
    await expect
      .poll(() =>
        slot.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
          canvas
            .getContext('2d')!
            .getImageData(0, 0, 32, 32)
            .data.some((value, index) => index % 4 === 3 && value > 0),
        ),
      )
      .toBe(true);
    await page.screenshot({ path: `test-results/gathered-${itemId}-inventory.png` });
    await inventory.getByRole('button', { name: 'Close Inventory', exact: true }).click();
  }
});
