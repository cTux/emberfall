import { test, expect } from './fixtures';
import {
  VILLAGE_RESOURCES,
  resourceNodes,
  wrap,
  FOREST,
  PLANT_KINDS,
  itemDefinition,
} from '../packages/core/src/index.ts';

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
    await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Gather plant');
    await expect(async () => {
      await page.keyboard.press('e');
      expect(world.resources?.[node.id]?.remaining).toBe(0);
    }).toPass({ intervals: [500] });
    expect(player.backpack!.find((item) => item.itemId === itemId)?.quantity).toBe(1);
    await page.getByRole('button', { name: 'Inventory (I)' }).click();
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

test('click and E gather replicated resources in village and forest, show depleted art and restore', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((w) => w.players.size)!;
  const player = [...world.players.values()][0];
  const canvas = page.locator('canvas');
  const rock = VILLAGE_RESOURCES.find((node) => node.kind === 'rock')!;
  player.x = rock.x;
  player.y = rock.y - 15;
  await page.mouse.move(-1, -1);
  await expect(async () => {
    await page.keyboard.press('e');
    expect(world.resources?.[rock.id]?.remaining).toBe(0);
  }).toPass({ intervals: [500] });
  expect(player.backpack!.find((i) => i.itemId === 'rock')?.quantity).toBe(1);
  await expect(canvas).toHaveAttribute('data-depleted-resources', '1');
  await page.screenshot({ path: 'test-results/gathering-depleted-rock.png' });
  await page.getByRole('button', { name: 'Inventory (I)' }).click();
  const inventory = page.getByRole('dialog', { name: 'Inventory', exact: true });
  await expect(inventory.getByRole('button', { name: 'Use Rock', exact: true })).toBeVisible();
  const before = structuredClone(player.backpack);
  await page.keyboard.press('e');
  expect(player.backpack).toEqual(before);
  await inventory.getByRole('button', { name: 'Close Inventory', exact: true }).click();

  const tree = VILLAGE_RESOURCES.find((node) => node.kind === 'tree')!;
  player.x = tree.x;
  player.y = tree.y + 5;
  await page.mouse.move(-1, -1);
  const clickTree = async () => {
    const viewport = page.viewportSize()!;
    const scale = Math.max(viewport.width / 960, viewport.height / 640);
    await page.mouse.click(viewport.width / 2, viewport.height / 2 - 45 * scale);
  };
  await expect(canvas).toHaveAttribute('data-resource', tree.id);
  await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Gather tree');
  await clickTree();
  await expect.poll(() => world.resources?.[tree.id]?.remaining).toBe(4);
  await expect(canvas).toHaveAttribute('data-resource-health', '4');
  await page.screenshot({ path: 'test-results/gathering-tree-health.png' });
  for (let remaining = 3; remaining >= 0; remaining--) {
    await page.waitForTimeout(450);
    await page.keyboard.press('e');
    await expect.poll(() => world.resources?.[tree.id]?.remaining).toBe(remaining);
  }
  await expect(canvas).toHaveAttribute('data-depleted-resources', '2');
  await page.screenshot({ path: 'test-results/gathering-stump.png' });
  world.resources![tree.id].restoresAt = Date.now() - 1;
  await expect.poll(() => world.resources?.[tree.id]).toBeUndefined();
  await expect(canvas).toHaveAttribute('data-depleted-resources', '1');
  await page.screenshot({ path: 'test-results/gathering-restored-tree.png' });

  world.scene = {
    ...world.training!,
    id: 'gathering-forest',
    electorate: '',
    training: false,
    phase: 'active',
    enemies: [],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
  };
  player.scene = 'forest';
  const plant = resourceNodes({ x: 1, y: 1, scene: 'forest' }, 300).find(
    (n) => n.kind === 'plant',
  )!;
  player.x = wrap(plant.x, FOREST.width);
  player.y = wrap(plant.y + 25, FOREST.height);
  await page.mouse.move(-1, -1);
  await expect(canvas).toHaveAttribute('aria-label', 'Forest combat scene.');
  await expect(canvas).toHaveAttribute('data-interaction-prompt', /^Gather /);
  await expect(async () => {
    await page.keyboard.press('e');
    expect(world.resources?.[plant.id]?.remaining).toBe(0);
  }).toPass({ intervals: [500] });
  expect(player.backpack!.some((i) => i.itemId === 'plant')).toBe(true);
  await expect(canvas).toHaveAttribute('data-depleted-resources', '2');
  await page.screenshot({ path: 'test-results/gathering-forest-plant.png' });
  await page.getByRole('button', { name: 'Inventory (I)' }).click();
  await expect(inventory.getByRole('button', { name: 'Use Plant', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
