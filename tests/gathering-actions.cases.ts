import { test, expect } from './fixtures';
import {
  VILLAGE_RESOURCES,
  resourceNodes,
  wrap,
  FOREST,
  PLANT_KINDS,
} from '../packages/core/src/index.ts';

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
  await expect(canvas).toHaveAttribute('data-resource', rock.id);
  await page.keyboard.press('e');
  await expect(canvas).toHaveAttribute('data-gathering', rock.id);
  await page.screenshot({ path: 'test-results/gathering-active-rock.png' });
  await expect.poll(() => world.resources?.[rock.id]?.remaining, { timeout: 7000 }).toBe(0);
  expect(player.backpack!.find((i) => i.itemId === 'rock')?.quantity).toBe(1);
  await expect(canvas).toHaveAttribute('data-depleted-resources', '1');
  await page.screenshot({ path: 'test-results/gathering-depleted-rock.png' });
  await page.getByRole('button', { name: 'Inventory' }).click();
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
  await expect.poll(() => world.resources?.[tree.id]?.remaining, { timeout: 7000 }).toBe(4);
  await expect(canvas).toHaveAttribute('data-resource-health', '4');
  await page.screenshot({ path: 'test-results/gathering-tree-health.png' });
  for (let remaining = 3; remaining >= 0; remaining--) {
    await page.keyboard.press('e');
    await expect
      .poll(() => world.resources?.[tree.id]?.remaining, { timeout: 7000 })
      .toBe(remaining);
  }

  await expect(canvas).toHaveAttribute('data-depleted-resources', '2');
  await page.screenshot({ path: 'test-results/gathering-stump.png' });
  world.resources![tree.id].restoresAt = Date.now() - 1;
  await expect.poll(() => world.resources?.[tree.id]).toBeUndefined();
  await expect(canvas).toHaveAttribute('data-depleted-resources', '1');
  await page.screenshot({ path: 'test-results/gathering-restored-tree.png' });

  game.runtime.parties(world).run([...world.players.values()][0]).scene = {
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
  player.y = wrap(plant.y - 15, FOREST.height);
  await page.mouse.move(-1, -1);
  await expect(canvas).toHaveAttribute('aria-label', 'Forest combat scene.');
  await expect(canvas).toHaveAttribute('data-resource', plant.id);
  await expect(canvas).toHaveAttribute('data-interaction-prompt', '');
  await page.keyboard.press('e');
  await expect(canvas).toHaveAttribute('data-gathering', plant.id);
  await page.screenshot({ path: 'test-results/gathering-active-forest.png' });
  await expect
    .poll(() => game.runtime.parties(world).run(player).resources?.[plant.id]?.remaining, {
      timeout: 7000,
    })
    .toBe(0);
  expect(player.backpack!.some((i) => i.itemId === 'plant')).toBe(true);
  await expect(canvas).toHaveAttribute('data-depleted-resources', '1');
  await page.screenshot({ path: 'test-results/gathering-forest-plant.png' });
  await page.getByRole('button', { name: 'Inventory' }).click();
  await expect(inventory.getByRole('button', { name: 'Use Plant', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('green-zone E hits shorten gathering, replace the zone and allow the next gather immediately', async ({
  page,
  game,
}) => {
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
  const activity = structuredClone(player.gathering!);
  await page.screenshot({ path: 'test-results/gathering-minigame-plant.png' });
  await page.waitForFunction(() => {
    const data = document.querySelector('canvas')!.dataset;
    const offset = Number(data.gatheringIndicator) - Number(data.gatheringZone);
    if (offset <= 0.03 || offset >= 0.11) return false;
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyE', key: 'e' }));

    return true;
  });
  await expect.poll(() => player.gathering?.endsAt).toBe(activity.endsAt - 2000);
  expect(player.gathering!.checkId).not.toBe(activity.checkId);
  expect(world.resources?.[node.id]).toBeUndefined();
  await expect.poll(() => world.resources?.[node.id]?.remaining, { timeout: 5000 }).toBe(0);
  expect(player.backpack!.find((i) => i.itemId === PLANT_KINDS[node.variant!])?.quantity).toBe(1);
  await expect(canvas).toHaveAttribute('data-gathering', '');
  const next = VILLAGE_RESOURCES.find((n) => n.kind === 'plant' && n.id !== node.id)!;
  Object.assign(player, { x: next.x, y: next.y - 15 });
  await expect(canvas).toHaveAttribute('data-resource', next.id);
  await page.keyboard.press('e');
  await expect(canvas).toHaveAttribute('data-gathering', next.id);
  player.x += 200;
  await expect(canvas).toHaveAttribute('data-gathering', '');
  expect(world.resources?.[next.id]).toBeUndefined();
});
