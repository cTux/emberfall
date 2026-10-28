import { test, expect } from './fixtures';
import { FOREST, TRAINING_ZONES } from '../packages/core/src/index.ts';

test('native game cursors follow UI hovers, dragging, combat and input blocking', async ({
  page,
  game,
}) => {
  await page.goto('/');
  const canvas = page.locator('canvas');
  await expect(page.locator('body')).toHaveCSS('cursor', /default\.png/);
  await expect(page.getByLabel('Your adventurer name')).toHaveCSS('cursor', /text\.png/);
  const join = page.getByRole('button', { name: /^Join Playtest Default/ });
  await expect(join).toHaveCSS('cursor', /pointer\.png/);
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
  game.runtime.parties(world).run([...world.players.values()][0]).scene = {
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
    const enemy = game.runtime.parties(world).run([...world.players.values()][0]).scene!.enemies[0];
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
    for (const size of [32, 48, 64]) {
      expect(
        await page.evaluate(
          async ({ name, size }) => {
            const image = new Image();
            image.src = `/assets/cursors/${size}/${name}.png`;
            await image.decode();
            return [image.naturalWidth, image.naturalHeight];
          },
          { name: state, size },
        ),
      ).toEqual([size, size]);
    }
  }
});

test('cursor enable and size settings apply immediately and persist across reloads', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const body = page.locator('body');
  const dialog = page.getByRole('dialog', { name: 'Settings', exact: true });
  const toggle = dialog.getByRole('switch', { name: 'Custom cursor', exact: true });
  const size = dialog.getByRole('combobox', { name: 'Cursor size', exact: true });
  await expect(toggle).toBeChecked();
  await expect(body).toHaveCSS('cursor', /\/48\/default\.png/);
  await expect(size).toHaveCSS('cursor', /\/48\/pointer\.png/);
  await size.click();
  await expect(page.getByRole('option', { name: 'Medium · 48 px' })).toHaveCSS(
    'cursor',
    /\/48\/pointer\.png/,
  );
  await page.screenshot({ path: 'test-results/cursor-settings-dropdown.png' });
  await page.getByRole('option', { name: 'Large · 64 px' }).click();
  await expect(body).toHaveCSS('cursor', /\/64\/default\.png/);
  await expect(dialog.getByRole('heading', { name: 'Settings', exact: true })).toHaveCSS(
    'cursor',
    /\/64\/grab\.png/,
  );
  await page.screenshot({ path: 'test-results/cursor-settings.png' });
  await toggle.uncheck();
  await expect(size).toHaveAttribute('aria-disabled', 'true');
  await expect(size).toHaveCSS('cursor', 'not-allowed');
  await expect(body).toHaveCSS('cursor', 'default');
  await expect(dialog.getByRole('heading', { name: 'Settings', exact: true })).toHaveCSS(
    'cursor',
    'grab',
  );
  await expect(page.getByRole('button', { name: 'Close Settings' })).toHaveCSS('cursor', 'pointer');
  await dialog.getByRole('tab', { name: 'Graphics', exact: true }).click();
  const frameLimit = dialog.getByRole('combobox', { name: 'Frame rate limit', exact: true });
  await expect(frameLimit).toHaveCSS('cursor', 'pointer');
  await frameLimit.click();
  await expect(page.getByRole('option', { name: '30 FPS' })).toHaveCSS('cursor', 'pointer');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(body).toHaveAttribute('data-custom-cursor', 'false');
  await expect(body).toHaveAttribute('data-cursor-size', '64');
  await expect(body).toHaveCSS('cursor', 'default');
  // Check every canvas fallback, independently of the combat-state derivation above.
  for (const [state, keyword] of [
    ['default', 'default'],
    ['attack', 'crosshair'],
    ['aim', 'crosshair'],
    ['pressed', 'crosshair'],
    ['disabled', 'not-allowed'],
  ]) {
    expect(
      await page.evaluate((state) => {
        const probe = document.createElement('canvas');
        probe.dataset.cursor = state;
        document.body.append(probe);
        const cursor = getComputedStyle(probe).cursor;
        probe.remove();
        return cursor;
      }, state),
    ).toBe(keyword);
  }
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect(body).toHaveCSS('cursor', /\/64\/default\.png/);
  await size.click();
  await expect(page.getByRole('option', { name: 'Small · 32 px' })).toHaveCSS(
    'cursor',
    /\/64\/pointer\.png/,
  );
  await page.getByRole('option', { name: 'Small · 32 px' }).click();
  await expect(body).toHaveCSS('cursor', /\/32\/default\.png/);
  await page.reload();
  await expect(body).toHaveCSS('cursor', /\/32\/default\.png/);
});

test('pointing hotspots stay on the visible artwork at every size', async ({ page }) => {
  await page.goto('/');
  for (const size of [32, 48, 64]) {
    await page.locator('body').evaluate((body, size) => {
      body.dataset.cursorSize = String(size);
    }, size);
    for (const state of ['default', 'pointer', 'attack', 'pressed']) {
      const alpha = await page.evaluate(async (state) => {
        const cursor = getComputedStyle(document.body).getPropertyValue(`--cursor-${state}`);
        const match = /url\(["']?([^"')]+)["']?\)\s+(\d+)\s+(\d+)/.exec(cursor)!;
        const image = new Image();
        image.src = match[1];
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d')!;
        context.drawImage(image, 0, 0);
        return context.getImageData(Number(match[2]), Number(match[3]), 1, 1).data[3];
      }, state);
      expect(alpha, `${size}px ${state} hotspot must touch the solid icon`).toBeGreaterThanOrEqual(
        220,
      );
    }
  }
});

test('drag cursor anchors match the default cursor at every size', async ({ page }) => {
  await page.goto('/');
  for (const size of [32, 48, 64]) {
    const anchors = await page.locator('body').evaluate((body, size) => {
      body.dataset.cursorSize = String(size);
      const style = getComputedStyle(body);
      return ['default', 'grab', 'grabbing'].map((state) => {
        const cursor = style.getPropertyValue(`--cursor-${state}`);
        return /\)\s+(\d+)\s+(\d+)/.exec(cursor)!.slice(1).map(Number);
      });
    }, size);
    expect(anchors[1], `${size}px grab anchor`).toEqual(anchors[0]);
    expect(anchors[2], `${size}px grabbing anchor`).toEqual(anchors[0]);
  }
});
