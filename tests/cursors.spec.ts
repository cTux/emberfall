import { test, expect } from './fixtures';
import { FOREST, TRAINING_ZONES } from '../packages/core/src/index.ts';

test('native game cursors follow UI hovers, dragging, combat and input blocking', async ({
  page,
  game,
}) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('body')).toHaveCSS('cursor', /default\.svg/);
  await expect(page.getByLabel('Your adventurer name')).toHaveCSS('cursor', /text\.png/);
  const join = page.getByRole('button', { name: /^Join Playtest Default/ });
  await expect(join).toHaveCSS('cursor', /pointer\.svg/);
  await join.click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  await page.keyboard.press('f');
  const dummy = world.training!.enemies[0];
  const zone = TRAINING_ZONES[0];
  player.x = zone.x;
  player.y = zone.y;
  // Aim feedback proves the new confirmed location has reached presentation.
  await page.keyboard.press('g');
  await page.mouse.move(900, 500);
  await expect(canvas).toHaveAttribute('data-cursor', 'aim');
  await expect(canvas).toHaveCSS('cursor', /aim\.png/);
  await page.mouse.down();
  await expect(canvas).toHaveAttribute('data-cursor', 'pressed');
  await page.mouse.up();
  await expect(canvas).toHaveAttribute('data-cursor', 'aim');
  await page.keyboard.press('g');
  const hoverDummy = async () => {
    const viewport = page.viewportSize()!;
    const scale = Math.max(viewport.width / 960, viewport.height / 640);
    await page.mouse.move(
      viewport.width / 2 + (dummy.x - player.x) * scale,
      viewport.height / 2 + (dummy.y - 9 - player.y) * scale,
    );
  };
  await hoverDummy();
  await expect(canvas).toHaveAttribute('data-cursor', 'attack');
  await expect(canvas).toHaveCSS('cursor', /attack\.png/);
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(canvas).toHaveAttribute('data-cursor', 'default');
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  const title = dialog.getByRole('heading', { name: 'Settings', exact: true });
  await expect(title).toHaveCSS('cursor', /grab\.png/);
  const box = (await title.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + box.height / 2);
  await page.mouse.down();
  await expect(title).toHaveCSS('cursor', /grabbing\.png/);
  await page.mouse.move(box.x + 70, box.y + box.height / 2 + 20);
  await page.mouse.up();
  await expect(title).toHaveCSS('cursor', /grab\.png/);
  await page.getByRole('button', { name: 'Close Settings' }).click();

  // Arrange a forest scene with one enemy across the horizontal seam.
  world.scene = {
    ...world.training!,
    id: 'cursor-forest',
    electorate: '',
    training: false,
    enemies: [{ ...dummy, x: FOREST.width - 12, y: 300 }],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
  };
  player.scene = 'forest';
  player.x = 12;
  player.y = 300;
  await expect(canvas).toHaveAttribute('aria-label', 'Forest combat scene.');
  await page.keyboard.press('g');
  await page.mouse.move(900, 500);
  await expect(canvas).toHaveAttribute('data-cursor', 'aim');
  await page.keyboard.press('g');
  await expect(async () => {
    const enemy = world.scene!.enemies[0];
    const scale = Math.max(1440 / 960, 1000 / 640);
    const dx = ((enemy.x - player.x + FOREST.width * 1.5) % FOREST.width) - FOREST.width / 2;
    await page.mouse.move(720 + dx * scale, 500 + (enemy.y - 9 - player.y) * scale);
    await expect(canvas).toHaveAttribute('data-cursor', 'attack');
  }).toPass();
  await page.screenshot({ path: 'test-results/cursors-forest.png' });
  player.hitpoints = 0;
  await expect(page.getByRole('heading', { name: 'You have fallen' })).toBeVisible();
  await page.mouse.move(1100, 600);
  await expect(canvas).toHaveAttribute('data-cursor', 'disabled');
  await expect(canvas).toHaveCSS('cursor', /disabled\.png/);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  await expect(canvas).toHaveAttribute('data-cursor', 'default');

  // Every shipped cursor decodes at a browser-safe size.
  for (const state of [
    'default',
    'pointer',
    'attack',
    'aim',
    'pressed',
    'disabled',
    'grab',
    'grabbing',
    'text',
  ]) {
    const glove = state === 'default' || state === 'pointer';
    const extension = glove ? 'svg' : 'png';
    expect(
      await page.evaluate(
        async ({ name, extension }) => {
          const image = new Image();
          image.src = `/assets/cursors/${name}.${extension}`;
          await image.decode();
          return [image.naturalWidth, image.naturalHeight];
        },
        { name: state, extension },
      ),
    ).toEqual(glove ? [48, 48] : [32, 32]);
  }
});
