import { test, expect } from './fixtures';
import { LOBBY_PORTAL } from '../packages/core/src/index.ts';

test('menu hotkeys show in tooltips and open safely in lobby, village and forest', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.evaluate(() => {
    window.addEventListener('keydown', (event) => {
      if (event.code === 'F1') {
        document.documentElement.dataset.f1Prevented = 'pending';
        setTimeout(() => {
          document.documentElement.dataset.f1Prevented = String(event.defaultPrevented);
        });
      }
    });
  });
  const codex = page.getByRole('dialog', { name: 'Codex', exact: true });
  const settings = page.getByRole('dialog', { name: 'Settings', exact: true });
  for (const [name, shortcut] of [
    ['Codex', 'F1'],
    ['Settings', 'Esc'],
  ]) {
    await page.getByRole('button', { name, exact: true }).hover();
    await expect(page.getByRole('tooltip')).toHaveText(`${name} (${shortcut})`);
    await page.mouse.move(700, 400);
    await expect(page.getByRole('tooltip')).toBeHidden();
  }
  await page.keyboard.press('F1');
  await expect(codex).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-f1-prevented', 'true');
  await page.keyboard.press('F1');
  await expect(codex).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-f1-prevented', 'true');
  await page.keyboard.down('F1');
  await expect(codex).toBeVisible();
  await page.keyboard.down('F1');
  await expect(codex).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('data-f1-prevented', 'true');
  await page.keyboard.up('F1');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('Escape');
  await expect(settings).toBeVisible();
  await page.keyboard.press('F1');
  await expect(settings).toBeVisible();
  await expect(codex).toBeHidden();
  await expect(page.locator('html')).toHaveAttribute('data-f1-prevented', 'true');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();

  for (const [name, shortcut] of [
    ['Talents', 'N'],
    ['Tactics', 'T'],
    ['Inventory', 'I'],
  ]) {
    await page.getByRole('button', { name, exact: true }).hover();
    await expect(page.getByRole('tooltip')).toHaveText(`${name} (${shortcut})`);
    await page.mouse.move(700, 400);
    await expect(page.getByRole('tooltip')).toBeHidden();
  }
  const controls = page.getByRole('navigation', { name: 'Game controls' });
  await expect(controls.getByRole('button')).toHaveText(['I', 'N', 'T', 'F1', 'Esc', '']);
  await expect(controls.locator('kbd')).toHaveText(['I', 'N', 'T', 'F1', 'Esc']);
  await page.keyboard.press('Control+F1');
  await page.keyboard.press('Shift+Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.keyboard.press('Enter');
  const chat = page.getByRole('textbox', { name: 'Chat message', exact: true });
  await expect(chat).toBeFocused();
  await chat.press('F1');
  await expect(page.getByRole('dialog')).toBeHidden();
  await chat.press('Escape');
  await expect(chat).toBeHidden();
  await expect(page.getByRole('dialog')).toBeHidden();

  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  for (const scene of ['village', 'forest']) {
    for (const [name, shortcut] of [
      ['Codex', 'F1'],
      ['Inventory', 'i'],
      ['Talents', 'n'],
      ['Tactics', 't'],
    ]) {
      const window = page.getByRole(name === 'Talents' ? 'region' : 'dialog', {
        name,
        exact: true,
      });
      await page.keyboard.press(shortcut);
      await expect(window).toBeVisible();
      await page.keyboard.press(shortcut);
      await expect(window).toBeHidden();
      await page.keyboard.press(shortcut);
      await expect(window).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(window).toBeHidden();
    }
    await expect(controls.locator('kbd')).toHaveText(['I', 'N', 'T', 'F1', 'Esc']);
    await page.screenshot({ path: `test-results/hud-toolbar-${scene}.png` });
    if (scene === 'village') await controls.screenshot({ path: 'test-results/hud-toolbar.png' });
    await page.keyboard.press('Escape');
    await expect(settings).toBeVisible();
    await page.screenshot({ path: `test-results/hotkeys-settings-${scene}.png` });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
    expect(world.players.has(player.id)).toBe(true);
    if (scene === 'village') {
      player.x = LOBBY_PORTAL.x;
      player.y = LOBBY_PORTAL.y - 15;
      const portal = page.getByRole('dialog', { name: 'Forest portal' });
      await expect(async () => {
        await page.keyboard.press('e');
        await expect(portal).toBeVisible();
      }).toPass({ intervals: [200], timeout: 6000 });
      await portal.getByRole('button', { name: 'Create', exact: true }).click();
      await portal.getByRole('button', { name: "I'm ready" }).click();
      await expect(page.getByLabel('Forest combat scene.')).toBeVisible({ timeout: 10000 });
    }
  }
  await page.getByRole('button', { name: 'Leave world' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
});

test('movement follows physical keys across layouts and layout changes', async ({ page, game }) => {
  const movement = () => {
    const player = [...game.runtime.worlds.values()].flatMap((world) => [
      ...world.players.values(),
    ])[0];
    return { x: player?.inputX ?? 0, y: player?.inputY ?? 0 };
  };
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect(page.locator('canvas')).toHaveAttribute('data-renderer', 'pixijs-webgl');

  const sendKey = (type: string, code: string, key: string) =>
    page.evaluate(
      (event) => window.dispatchEvent(new KeyboardEvent(event.type, { ...event, bubbles: true })),
      { type, code, key },
    );
  const codes = ['KeyW', 'KeyA', 'KeyS', 'KeyD'];
  const directions = [
    { x: 0, y: -1 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 1, y: 0 },
  ];
  for (const keys of [
    ['w', 'a', 's', 'd'],
    ['ц', 'ф', 'і', 'в'],
    ['ц', 'ф', 'ы', 'в'],
    ['z', 'q', 's', 'd'],
    [',', 'a', 'o', 'e'],
  ]) {
    for (const [index, code] of codes.entries()) {
      await sendKey('keydown', code, keys[index]);
      await expect.poll(movement).toEqual(directions[index]);
      // Releasing after a layout switch must still stop the same physical key.
      await sendKey('keyup', code, codes[index].slice(3).toUpperCase());
      await expect.poll(movement).toEqual({ x: 0, y: 0 });
    }
  }
  for (const [index, code] of ['ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight'].entries()) {
    await sendKey('keydown', code, code);
    await expect.poll(movement).toEqual(directions[index]);
    await sendKey('keyup', code, code);
    await expect.poll(movement).toEqual({ x: 0, y: 0 });
  }
  await sendKey('keydown', 'KeyD', 'в');
  await sendKey('keydown', 'ArrowRight', 'ArrowRight');
  await sendKey('keyup', 'KeyD', 'd');
  await expect.poll(movement).toEqual({ x: 1, y: 0 });
  await sendKey('keyup', 'ArrowRight', 'ArrowRight');
  await expect.poll(movement).toEqual({ x: 0, y: 0 });
  await sendKey('keydown', 'KeyD', 'd');
  await expect.poll(movement).toEqual({ x: 1, y: 0 });
  const settings = page.getByRole('button', { name: 'Settings', exact: true });
  await settings.click();
  await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
  await expect.poll(movement).toEqual({ x: 0, y: 0 });
  await sendKey('keydown', 'ArrowRight', 'ArrowRight');
  await page.waitForTimeout(150);
  expect(movement()).toEqual({ x: 0, y: 0 });
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await expect(settings).toBeFocused();
  await sendKey('keyup', 'KeyD', 'd');
  await sendKey('keyup', 'ArrowRight', 'ArrowRight');
  await sendKey('keydown', 'KeyD', 'd');
  await expect.poll(movement).toEqual({ x: 1, y: 0 });
  await sendKey('keyup', 'KeyD', 'd');
});
