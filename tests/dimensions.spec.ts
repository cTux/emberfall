import { sharp } from './interaction-outlines.fixture';
import { test, expect } from './fixtures';
import { LOBBY_PORTAL, dimensionDefinition, resourceNodes } from '../packages/core/src/index.ts';

for (const dimension of ['swamp', 'desert'] as const) {
  test(`${dimension} portal choice enters dedicated terrain, enemies and gatherable resources`, async ({
    page,
    game,
  }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    const missingAssets: string[] = [];
    page.on('response', (response) => {
      if (response.url().includes('/assets/dimensions/') && response.status() !== 200) {
        missingAssets.push(response.url());
      }
    });
    await page.goto('/');
    await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
    await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
    const world = [...game.runtime.worlds.values()].find((world) => {
      return world.players.size;
    })!;
    const player = [...world.players.values()][0];
    player.x = LOBBY_PORTAL.x;
    player.y = LOBBY_PORTAL.y + 45;
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Portal');
    await page.keyboard.press('e');
    const portal = page.getByRole('dialog', { name: 'Portal' });
    await portal.getByRole('combobox', { name: 'Dimension' }).click();
    await page
      .getByRole('option', { name: dimensionDefinition(dimension).name, exact: true })
      .click();
    await expect(portal).toContainText(
      `${dimensionDefinition(dimension).rarityMultiplier}× loot rarity`,
    );
    await portal.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(portal).toContainText(dimensionDefinition(dimension).name);
    await portal.getByRole('button', { name: "I'm ready" }).click();
    await expect(canvas).toHaveAttribute('data-dimension', dimension, { timeout: 15000 });
    expect(player.dimension).toBe(dimension);
    await expect(canvas).toHaveAttribute('data-dimension-art-ready', 'true');

    if (dimension === 'desert') {
      const screenshot = await canvas.screenshot();
      const metadata = await sharp(screenshot).metadata();
      const patch = await sharp(screenshot)
        .extract({
          left: Math.floor(metadata.width / 2) + 60,
          top: Math.floor(metadata.height / 2) + 90,
          width: 8,
          height: 8,
        })
        .stats();
      expect(patch.channels[0].mean).toBeGreaterThan(patch.channels[1].mean * 1.1);
    }

    player.autoAttack = false;
    // Arrange visibility through the test-owned server; gathering still uses the real client command.
    const node = resourceNodes(player, 800).find((node) => {
      return node.kind === 'plant';
    })!;
    player.x = node.x;
    player.y = node.y - 15;
    await page.mouse.move(-1, -1);
    await expect(canvas).toHaveAttribute('data-resource', node.id);
    await page.keyboard.press('e');
    await expect
      .poll(
        () => {
          return player.backpack?.some((item) => {
            return item.itemId === dimensionDefinition(dimension).resources.plant;
          });
        },
        { timeout: 10000 },
      )
      .toBe(true);
    await expect(canvas).toHaveAttribute('data-dimension-art-ready', 'true');
    await page.screenshot({ path: `test-results/dimension-${dimension}.png` });
    const run = game.runtime.parties(world).run(player).scene!;
    run.enemies = [];
    run.spawns = [];
    run.nextSpawn = Date.now() + 60000;
    run.endsAt = Date.now();
    player.x = 2400;
    player.y = 1280;
    await expect
      .poll(() => {
        return run.enemies.some((enemy) => {
          return enemy.kind === 'boss';
        });
      })
      .toBe(true);
    const boss = run.enemies.find((enemy) => {
      return enemy.kind === 'boss';
    })!;
    await expect(page.getByText(boss.name!, { exact: true })).toBeVisible();
    await page.screenshot({ path: `test-results/dimension-${dimension}-boss.png` });
    player.x = boss.x - 25;
    player.y = boss.y;
    boss.hitpoints = 1;
    player.autoAttack = true;
    await expect
      .poll(() => {
        return run.phase;
      })
      .toBe('ended');
    await expect(canvas).toHaveAttribute('data-interaction-prompt', 'Return to village');
    await page.keyboard.press('e');
    await expect(page.getByLabel('Shared village. Move with WASD or arrow keys.')).toBeVisible();
    expect(player.dimension).toBeUndefined();
    expect(missingAssets).toEqual([]);
    expect(errors).toEqual([]);
  });
}
