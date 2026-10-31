import { test, expect } from './fixtures';
import { LOBBY_PORTAL } from '../packages/core/src/index.ts';

// Exercise fresh defaults and saved preferences without the fixture's preset override.
test.use({ graphicsPreset: null });

test('chat inherits window styling and preserves keyboard interaction at desktop and narrow widths', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const chat = page.getByRole('complementary', { name: 'World chat', exact: true });
  const input = page.getByRole('textbox', {
    name: 'Chat message',
    exact: true,
    includeHidden: true,
  });
  const send = chat.getByRole('button', { name: 'Send', exact: true });
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const surface = await page
    .getByRole('dialog', { name: 'Settings', exact: true })
    .locator('.game-window-surface')
    .evaluate((element) => {
      const style = getComputedStyle(element);

      return {
        background: style.backgroundColor,
        border: style.borderTopColor,
        radius: style.borderTopLeftRadius,
        color: style.color,
        font: style.fontFamily,
      };
    });
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  for (const width of [1440, 800, 390]) {
    await page.setViewportSize({ width, height: 800 });
    await page.locator('canvas').click({ position: { x: width - 1, y: 400 } });
    await page.mouse.move(width - 1, 400);
    await expect(input).toBeHidden();
    await expect(chat).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await page.keyboard.press('Enter');
    await expect(input).toBeFocused();
    await expect(chat).toHaveCSS('background-color', surface.background);
    await expect(chat).toHaveCSS('border-top-color', surface.border);
    await expect(chat).toHaveCSS('border-top-left-radius', surface.radius);
    await expect(chat).toHaveCSS('color', surface.color);
    await expect(input).toHaveCSS('font-family', surface.font);
    await expect(send).toBeDisabled();
    await input.fill(`Window styled chat at ${width}px`);
    await expect(send).toBeEnabled();
    await page.screenshot({ path: `test-results/chat-window-${width}.png` });
    const bounds = await chat.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    await input.press('Enter');
    await expect(page.getByRole('log')).toContainText(`Window styled chat at ${width}px`);
    await expect(input).not.toBeFocused();
    await page.keyboard.press('Enter');
    await expect(input).toBeFocused();
    await input.press('Escape');
    await expect(input).toBeHidden();
  }
});

test.describe('touch chat', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('shows themed controls without hover and sends messages', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
    const chat = page.getByRole('complementary', { name: 'World chat', exact: true });
    const input = page.getByRole('textbox', { name: 'Chat message', exact: true });
    await expect(input).toBeVisible();
    await expect(chat).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await input.fill('Hello from touch');
    await chat.getByRole('button', { name: 'Send', exact: true }).tap();
    await expect(page.getByRole('log')).toContainText('Hello from touch');
    await page.screenshot({ path: 'test-results/chat-window-touch.png' });
  });
});

test('fog is opt-in and player messages sit above health in village and forest', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  const fog = page.getByLabel('Volumetric fog (2D)', { exact: true });
  await expect(fog).not.toBeChecked();
  for (const preset of ['Low', 'Balanced', 'High']) {
    await page.getByRole('button', { name: preset, exact: true }).click();
    await expect(fog).not.toBeChecked();
  }

  await fog.check();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'Graphics', exact: true }).click();
  await expect(fog).toBeChecked();
  await fog.uncheck();
  await page.getByRole('button', { name: 'Close Settings', exact: true }).click();
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => world.players.size)!;
  const player = [...world.players.values()][0];
  const send = async (text: string) => {
    await page.getByRole('complementary', { name: 'World chat', exact: true }).hover();
    await page.getByLabel('Chat message', { exact: true }).fill(text);
    await page.keyboard.press('Enter');
    await expect.poll(() => player.chat).toBe(text);
    await expect(page.getByRole('log')).toContainText(text);
    await page.keyboard.press('Escape');
    await page.mouse.move(700, 400);
    // Allow the confirmed snapshot and subsequent render to reach the canvas.
    await page.waitForTimeout(300);
  };

  await send('hello');
  await page.screenshot({ path: 'test-results/new-chat-village.png' });
  await page.setViewportSize({ width: 800, height: 600 });
  await send('A long player message that wraps across multiple lines right above the health bar.');
  await page.screenshot({ path: 'test-results/new-chat-village-wrapped.png' });
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
  await send('hello forest');
  await page.screenshot({ path: 'test-results/new-chat-forest.png' });
  expect(errors).toEqual([]);
});
