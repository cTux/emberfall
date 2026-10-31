import { test, expect } from './fixtures';
import { VILLAGE_RESOURCES, resourceNodes, wrap, FOREST } from '../packages/core/src/index.ts';

test('combat gathering hint defaults hidden, toggles immediately and persists', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((w) => {
    return w.players.size;
  })!;
  const player = [...world.players.values()][0];
  const canvas = page.locator('canvas');
  const rock = VILLAGE_RESOURCES.find((node) => {
    return node.kind === 'rock';
  })!;
  Object.assign(player, { x: rock.x, y: rock.y - 15 });
  await page.mouse.move(-1, -1);
  await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Gather rock');
  game.runtime.parties(world).run([...world.players.values()][0]).scene = {
    ...world.training!,
    id: 'hint-forest',
    electorate: '',
    training: false,
    phase: 'active',
    enemies: [],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
  };
  const plant = resourceNodes({ x: 1, y: 1, scene: 'forest' }, 300).find((node) => {
    return node.kind === 'plant';
  })!;
  Object.assign(player, {
    scene: 'forest',
    x: wrap(plant.x, FOREST.width),
    y: wrap(plant.y - 15, FOREST.height),
  });
  await expect(canvas).toHaveAttribute('data-resource', plant.id);
  await expect(canvas).toHaveAttribute('data-interaction-prompt', '');
  await page.screenshot({ path: 'test-results/gathering-hint-hidden-in-combat.png' });
  const toggle = page.getByRole('switch', {
    name: 'Hide interact hint during combat',
    exact: true,
  });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(toggle).toBeChecked();
  await toggle.uncheck();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Gather plant');
  await page.screenshot({ path: 'test-results/gathering-hint-shown-in-combat.png' });
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  game.runtime.parties(world).run([...world.players.values()][0]).scene!.phase = 'ended';
  await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Gather plant');
  game.runtime.parties(world).run([...world.players.values()][0]).scene!.portals = [
    { x: player.x, y: player.y },
  ];
  await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Return to village');
});
