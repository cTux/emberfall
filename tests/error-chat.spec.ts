import { test, expect } from './fixtures';
import { VILLAGE_RESOURCES } from '../packages/core/src/index.ts';

test('account and login failures appear only in chat before joining and Retry recovers', async ({
  page,
}) => {
  await page.route('**/api/account', (route) => route.fulfill({ status: 503 }), { times: 1 });
  await page.goto('/?login=failed');
  const log = page.getByRole('log');
  await expect(log).toContainText('System: Steam login was cancelled');
  await expect(log).toContainText('System: Account service unavailable');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(
    page.getByRole('textbox', { name: 'Chat message', includeHidden: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Retry', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Join Playtest Default/ })).toBeVisible();
});

test('gameplay errors are private system chat, capped at ten and visible beside dialogs', async ({
  page,
  browser,
  baseURL,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  const tree = VILLAGE_RESOURCES.find((entry) => entry.kind === 'plant')!;
  player.x = tree.x;
  player.y = tree.y + 5;
  player.backpack = Array.from({ length: 20 }, () => ({
    id: crypto.randomUUID(),
    itemId: 'warrior-sword',
    quantity: 1,
  }));
  await expect(page.locator('canvas')).toHaveAttribute('data-resource', tree.id);
  const peer = await browser.newContext({ baseURL, ignoreHTTPSErrors: true });
  try {
    const friend = await peer.newPage();
    await friend.goto('/');
    await friend.getByRole('button', { name: /^Join Playtest Default/ }).click();
    await expect(friend.getByRole('button', { name: 'Leave world' })).toBeVisible();
    const log = page.getByRole('log');
    await expect(page.locator('.party')).toHaveAttribute('aria-label', /2\/32 adventurers/);
    for (let count = 1; count <= 12; count++) {
      await expect(page.locator('canvas')).toHaveAttribute('data-gathering', '');
      await page.keyboard.press('e');
      await expect.poll(() => !!player.gathering).toBe(true);
      player.gathering!.endsAt = Date.now() - 1;
      await expect
        .poll(() => log.locator('.chat-danger').count())
        .toBeGreaterThanOrEqual(Math.min(count, 8));
    }
    await expect(log.locator(':scope > div')).toHaveCount(10);
    await expect(log).toContainText('System: The destination inventory is full.');
    await expect(page.locator('.notice')).toHaveCount(0);
    await expect(friend.getByRole('log')).not.toContainText('The destination inventory is full.');
    expect(
      world.chat?.some((message) => message.text === 'The destination inventory is full.'),
    ).toBe(false);
    await page.getByRole('button', { name: 'Inventory' }).click();
    await expect(page.getByRole('dialog', { name: 'Inventory', exact: true })).toBeVisible();
    await expect(log).toBeVisible();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await page.screenshot({ path: 'test-results/error-chat-inventory.png' });
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(log).toBeVisible();
    const chatBounds = await log.boundingBox();
    const dialogBounds = await page
      .getByRole('dialog', { name: 'Inventory', exact: true })
      .boundingBox();
    expect(chatBounds!.y).toBeGreaterThanOrEqual(dialogBounds!.y + dialogBounds!.height);
    await page.screenshot({ path: 'test-results/error-chat-narrow.png' });
  } finally {
    await peer.close();
  }
});

test('unavailable browser storage reports a system message after joining', async ({
  page,
  game,
}) => {
  const world = [...game.runtime.worlds.values()][0];
  world.chat = Array.from({ length: 10 }, (_, index) => ({
    id: `history-${index}`,
    playerId: '',
    name: 'System',
    text: `Older message ${index}`,
  }));
  await page.addInitScript(() => {
    const nativeSet = Object.getOwnPropertyDescriptor(Storage.prototype, 'setItem')!.value as (
      this: Storage,
      key: string,
      value: string,
    ) => void;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'emberfall-new.character') throw new Error('Storage disabled');
      nativeSet.call(this, key, value);
    };
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('log')).toContainText(
    'System: Your browser cannot remember this character key.',
  );
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('renderer startup failure is reported only as system chat', async ({ page }) => {
  await page.addInitScript(() => {
    const getContext = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, 'getContext')!
      .value as HTMLCanvasElement['getContext'];
    HTMLCanvasElement.prototype.getContext = function (
      this: HTMLCanvasElement,
      ...args: Parameters<typeof getContext>
    ) {
      if (String(args[0]).startsWith('webgl')) return null;
      return getContext.apply(this, args);
    } as typeof getContext;
  });
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('log')).toContainText('System: The game renderer could not start.');
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('scene changes retain server order when older NPC speech becomes visible', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  world.chat = [
    {
      id: 'old-npc',
      playerId: '',
      name: 'Marta',
      text: 'Older village speech',
      dimension: 'village',
    },
    { id: 'new-player', playerId: 'someone', name: 'Friend', text: 'Newer world speech' },
  ];
  player.scene = 'forest';
  const log = page.getByRole('log');
  await expect(log).toContainText('Newer world speech');
  await expect(log).not.toContainText('Older village speech');
  delete player.scene;
  await expect(log).toContainText('Older village speech');
  await expect(log.locator(':scope > div')).toHaveText([
    'Marta: Older village speech',
    'Friend: Newer world speech',
  ]);
});
