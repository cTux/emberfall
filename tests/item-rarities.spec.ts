import { test, expect } from './fixtures';
import {
  Rarity,
  rollItemStats,
  rarityColor,
  BUILDINGS,
  itemPrice,
  LOOT_ITEM_IDS,
} from '../packages/core/src/index.ts';

test('rarity borders and exact stat tooltips survive equipment, storage, trading, buyback and reload', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Rarity tester');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory (I)' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  player.backpack = Object.values(Rarity).map((rarity) => ({
    id: `rarity-${rarity}`,
    itemId: 'loot-helmet',
    quantity: 1,
    rarity,
    stats: rollItemStats('helmet', rarity, () => 0.5),
  }));
  player.coins = 100;
  await page.keyboard.press('i');
  const inventory = page.getByRole('dialog', { name: 'Inventory', exact: true });
  await expect(inventory).toBeVisible();
  const backpack = inventory.getByRole('region', { name: 'Your backpack' });
  for (const rarity of Object.values(Rarity)) {
    const slot = backpack.locator(`[data-backpack-item='rarity-${rarity}']`);
    const hex = rarityColor[rarity];
    const rgb = `rgb(${[1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16)).join(', ')})`;
    await expect(slot).toHaveCSS('border-top-color', rgb);
    await expect(slot).toHaveAttribute('data-rarity', rarity);
  }
  const uncommon = backpack.locator('[data-backpack-item=rarity-uncommon]');
  await uncommon.hover();
  await expect(page.getByRole('tooltip')).toContainText('Uncommon');
  await page.screenshot({ path: 'test-results/item-rarities-inventory.png' });
  const legendary = backpack.locator('[data-backpack-item=rarity-legendary]');
  const original = structuredClone(player.backpack.find((item) => item.id === 'rarity-legendary')!);
  await legendary.focus();
  await page.keyboard.press('Enter');
  const equipped = inventory.locator('[data-equipment-slot=helmet]');
  await expect(equipped).toHaveAttribute('data-rarity', 'legendary');
  await expect(equipped).toHaveCSS('border-top-color', 'rgb(255, 128, 0)');
  expect(player.equipmentItems!.helmet.stats).toEqual(original.stats);
  await equipped.click({ button: 'right' });
  await expect(legendary).toBeVisible();
  await inventory.getByRole('button', { name: 'Close Inventory' }).click();

  const storehouse = BUILDINGS.find((building) => building.id === 'storehouse')!;
  Object.assign(player, { x: storehouse.doorX, y: storehouse.y + 9 });
  const storage = page.getByRole('dialog', { name: 'Storehouse', exact: true });
  await expect(async () => {
    await page.keyboard.press('e');
    await expect(storage).toBeVisible({ timeout: 1000 });
  }).toPass({ intervals: [200], timeout: 6000 });
  await storage
    .getByRole('region', { name: 'Your backpack' })
    .locator('[data-backpack-item=rarity-legendary]')
    .click({ button: 'right' });
  const stored = storage
    .getByRole('region', { name: 'Storage 1', exact: true })
    .locator('[data-rarity=legendary]');
  await expect(stored).toHaveCSS('border-top-color', 'rgb(255, 128, 0)');
  expect(player.storages![0].items[0]).toEqual(original);
  await page.screenshot({ path: 'test-results/item-rarities-storage.png' });
  await stored.click({ button: 'right' });
  await storage.getByRole('button', { name: 'Close Storehouse' }).click();
  await expect(storage).toBeHidden();

  const bram = world.npcs!.find((npc) => npc.id === 'craftsman')!;
  Object.assign(bram, { x: 1000, y: 1000 });
  Object.assign(player, { x: 1000, y: 985 });
  await page.mouse.move(0, 0);
  await expect(page.locator('canvas[aria-label]')).toHaveAttribute(
    'data-interaction-prompt',
    'Bram the Craftsman',
  );
  const trader = page.getByRole('dialog', { name: 'Bram the Craftsman' });
  await page.keyboard.press('e');
  await expect(trader).toBeVisible();
  await expect(
    trader.getByRole('region', { name: "Craftsman's backpack" }).locator('[data-rarity]'),
  ).toHaveCount(LOOT_ITEM_IDS.length);
  await trader
    .getByRole('region', { name: 'Your backpack' })
    .locator('[data-backpack-item=rarity-legendary]')
    .click({ button: 'right' });
  await trader.getByRole('tab', { name: 'Buyback', exact: true }).click();
  const buyback = trader
    .getByRole('region', { name: 'Buyback', exact: true })
    .locator('[data-rarity=legendary]');
  await expect(buyback).toHaveCSS('border-top-color', 'rgb(255, 128, 0)');
  await buyback.hover();
  await expect(page.getByRole('tooltip')).toContainText('Legendary');
  await expect(page.getByRole('tooltip')).toContainText(`${itemPrice(original)} gold`);
  await page.screenshot({ path: 'test-results/bram-gear-buyback.png' });
  await buyback.click({ button: 'right' });
  expect(player.backpack!.find((item) => item.rarity === Rarity.Legendary)!.stats).toEqual(
    original.stats,
  );
  await trader.getByRole('button', { name: 'Close Bram the Craftsman' }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Inventory (I)' })).toBeVisible();
  await page.keyboard.press('i');
  await expect(page.locator('[data-backpack-item][data-rarity=legendary]')).toHaveCSS(
    'border-top-color',
    'rgb(255, 128, 0)',
  );
  expect(errors).toEqual([]);
});

test('native forest rendering shows all five rarity beams from server-confirmed drops', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Inventory (I)' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const run = game.runtime.parties(world).run(player);
  const now = Date.now();
  run.scene = {
    ...world.training!,
    id: run.runKey!,
    electorate: '',
    training: false,
    phase: 'active',
    nextSpawn: now + 1e8,
    endsAt: now + 1e8,
    enemies: [],
    drops: Object.values(Rarity).map((rarity, index) => ({
      id: index + 100,
      kind: 'item',
      itemId: 'warrior-sword',
      rarity,
      stats: rollItemStats('sword', rarity, () => 0.5),
      x: 2200 + index * 100,
      y: 1320,
      at: now,
    })),
  };
  Object.assign(player, {
    scene: 'forest',
    runId: run.runKey,
    x: 2400,
    y: 1400,
    autoLoot: false,
    autoAttack: false,
  });
  const canvas = page.locator('canvas[aria-label="Forest combat scene."]');
  await expect(canvas).toBeVisible();
  await expect.poll(() => run.scene!.drops!.length).toBe(5);
  await expect
    .poll(() =>
      page.evaluate(() =>
        performance
          .getEntriesByType('resource')
          .some((entry) => entry.name.includes('warrior-weapon.png')),
      ),
    )
    .toBe(true);
  await page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );
  await page.screenshot({ path: 'test-results/item-rarity-beams-forest.png' });
  expect(errors).toEqual([]);
});
