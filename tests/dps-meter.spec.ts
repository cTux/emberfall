import { test, expect } from './fixtures';
import { createTrainingScene, hitEnemy } from '../packages/core/src/index.ts';
import { randomUUID } from 'node:crypto';

test('DPS meter uses custom cursors and respects cursor preferences', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'DPS meter', exact: true }).check();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  const meter = page.getByLabel('Damage per second', { exact: true });
  const header = meter.locator('header');
  for (const size of [32, 48, 64, null]) {
    await page.locator('body').evaluate((body, size) => {
      body.dataset.customCursor = String(size !== null);
      if (size !== null) {
        body.dataset.cursorSize = String(size);
      }
    }, size);
    const cursor = (name: string) => {
      return size === null ? name : new RegExp(`/${size}/${name}\\.png`);
    };

    await expect(meter).toHaveCSS('cursor', cursor('default'));
    await expect(header).toHaveCSS('cursor', cursor('grab'));
    const box = (await header.boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await page.mouse.down();
    await expect(header).toHaveCSS('cursor', cursor('grabbing'));
    await page.mouse.move(box.x + 50, box.y + box.height / 2 + 10);
    await page.mouse.up();
    await expect(header).toHaveCSS('cursor', cursor('grab'));
    const row = meter.locator('button.damage-meter-row').first();
    await expect(row).toHaveCSS('cursor', cursor('pointer'));
    await row.click();
    const back = meter.getByRole('button', { name: 'Back to party' });
    await expect(back).toHaveCSS('cursor', cursor('pointer'));
    await expect(meter.getByText('No damage recorded.')).toHaveCSS('cursor', cursor('default'));
    await back.click();
  }
});

test('DPS meter toggles independently of performance graphs and persists across reloads', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const meter = page.getByLabel('Damage per second', { exact: true });
  await expect(meter).toHaveCount(0);
  await expect(page.getByLabel('Performance monitor', { exact: true })).toHaveCount(0);
  const openSettings = () => {
    return page.getByRole('button', { name: 'Settings', exact: true }).click();
  };

  const closeSettings = () => {
    return page.getByRole('button', { name: 'Close Settings' }).click();
  };

  const toggle = page.getByRole('switch', { name: 'DPS meter', exact: true });
  await openSettings();
  await expect(toggle).not.toBeChecked();
  for (const name of ['FPS graph', 'Latency graph']) {
    await expect(page.getByRole('switch', { name, exact: true })).not.toBeChecked();
  }

  await toggle.check();
  await closeSettings();
  await expect(meter).toBeVisible();
  await openSettings();
  await toggle.uncheck();
  await closeSettings();
  await expect(meter).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect(meter).toHaveCount(0);
  await openSettings();
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await page.screenshot({ path: 'test-results/dps-meter-settings-desktop.png' });
  await closeSettings();
  await expect(meter).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  await expect(meter).toBeVisible();
  await openSettings();
  await expect(toggle).toBeChecked();
  await closeSettings();
});

test('party damage bars drill into abilities and return with right click anywhere', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Blade');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size === 1;
  })!;
  const player = [...world.players.values()][0];
  player.autoAttack = false;
  player.partyId = randomUUID();
  player.classId = 'warrior';
  const mage = { ...player, id: randomUUID(), name: 'Ember', classId: 'mage' };
  const druid = { ...player, id: randomUUID(), name: 'Willow', classId: 'druid' };
  const ranger = { ...player, id: randomUUID(), name: 'Arrow', classId: 'ranger' };
  const outsider = { ...player, id: randomUUID(), name: 'Outsider', partyId: undefined };
  for (const member of [mage, druid, ranger, outsider]) {
    world.players.set(member.id, member);
  }

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'DPS meter', exact: true }).check();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  const meter = page.getByLabel('Damage per second', { exact: true });
  const rows = meter.locator('button.damage-meter-row');
  await expect(rows).toHaveCount(4);
  await expect(meter.locator('.damage-meter-columns, footer')).toHaveCount(0);
  await expect(rows.first()).toHaveCSS('padding-left', '6px');
  await expect(rows.filter({ hasText: 'Blade' }).locator('.damage-meter-icon img')).toHaveAttribute(
    'src',
    /warrior-portrait\.png$/,
  );
  await expect(rows.filter({ hasText: 'Ember' }).locator('.damage-meter-icon img')).toHaveAttribute(
    'src',
    /mage-portrait\.png$/,
  );
  await expect(meter).not.toContainText('Outsider');
  await expect(rows.first().locator('.damage-meter-bar')).toHaveAttribute('style', 'width: 0%;');
  await rows.filter({ hasText: 'Willow' }).click();
  await expect(meter).toContainText('No damage recorded.');
  await meter.click({ button: 'right' });
  const scene = createTrainingScene(Date.now());
  const enemy = scene.enemies[0];
  enemy.hitpoints = 10000;
  const now = Date.now();
  hitEnemy(scene, enemy, 500, player, now, undefined, 'physical', false, 'Slash');
  hitEnemy(scene, enemy, 100, player, now, undefined, 'physical', false, 'Bleed');
  hitEnemy(scene, enemy, 300, mage, now, undefined, 'fire', false, 'Fireball');
  hitEnemy(scene, enemy, 100, druid, now, undefined, 'physical', false, 'Bear');
  hitEnemy(scene, enemy, 2000, outsider, now);
  await expect(rows.first()).toContainText('Blade');
  await expect(rows.first()).toContainText('600 / 120 / 60.0%');
  await expect(rows.first().locator('.damage-meter-bar')).toHaveAttribute('style', 'width: 60%;');
  await expect(rows.nth(1)).toContainText('Ember');
  await expect(rows.nth(1)).toHaveCSS('--class-color', '#69ccf0');
  await expect(rows.first()).toHaveCSS('--class-color', '#c79c6e');
  await expect(rows.nth(2)).toHaveCSS('--class-color', '#ff7d0a');
  await expect(rows.nth(3)).toHaveCSS('--class-color', '#abd473');
  await rows.filter({ hasText: 'Willow' }).click();
  const bearIcon = meter.locator('.damage-meter-icon img');
  await expect(bearIcon).toHaveAttribute('src', /bear-cub\.png$/);
  await expect(bearIcon).toHaveCSS('width', '96px');
  await expect(bearIcon).toHaveCSS('height', '48px');
  await expect(bearIcon.locator('..')).toHaveCSS('overflow', 'hidden');
  await meter.screenshot({ path: 'test-results/damage-meter-bear.png' });
  await meter.getByRole('button', { name: 'Back to party' }).click();
  await meter.screenshot({ path: 'test-results/damage-meter-party.png' });
  await rows.first().click();
  await expect(meter).toContainText('Blade — Abilities');
  await expect(meter.locator('.damage-meter-row').first()).toContainText('Slash');
  await expect(meter.locator('.damage-meter-row').first()).toContainText('500 / 100 / 83.3%');
  await expect(
    meter.locator('.damage-meter-row').first().locator('.damage-meter-icon img'),
  ).toHaveAttribute('src', /warrior-spell\.png$/);
  await expect(
    meter
      .locator('.damage-meter-row')
      .filter({ hasText: 'Bleed' })
      .locator('.damage-meter-icon img'),
  ).toHaveAttribute('src', /bleed\.png$/);
  await meter.screenshot({ path: 'test-results/damage-meter-abilities.png' });
  for (const target of [
    meter.locator('header'),
    meter.locator('.damage-meter-row').first(),
    meter.locator('.damage-meter-icon').first(),
  ]) {
    await target.click({ button: 'right' });
    await expect(meter).toContainText('Damage done');
    await rows.first().click();
  }

  await meter.getByRole('button', { name: 'Back to party' }).click();
  await rows.first().focus();
  await page.keyboard.press('Enter');
  await expect(meter).toContainText('Blade — Abilities');
  await expect(meter.locator('.damage-meter-row').first()).toContainText('500 / 0 / 83.3%', {
    timeout: 10000,
  });
  player.partyId = undefined;
  await meter.getByRole('button', { name: 'Back to party' }).click();
  await expect(rows).toHaveCount(1);
  hitEnemy(scene, enemy, 50, player, Date.now(), undefined, 'physical', false, 'Whirlwind');
  await rows.first().click();
  await expect(
    meter
      .locator('.damage-meter-row')
      .filter({ hasText: 'Whirlwind' })
      .locator('.damage-meter-icon > span'),
  ).toHaveCSS('background-image', /warrior-icons\.png/);
  await meter.getByRole('button', { name: 'Back to party' }).click();
  player.partyId = mage.partyId;
  await expect(rows).toHaveCount(4);
  await rows.filter({ hasText: 'Ember' }).click();
  player.partyId = undefined;
  await expect(meter).toContainText('Damage done');
  await expect(rows).toHaveCount(1);
});
