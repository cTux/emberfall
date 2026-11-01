import { randomUUID } from 'node:crypto';
import { test, expect } from './fixtures';
import { heal } from '../packages/core/src/talents/effects.ts';
import { tickEnemyCombat } from '../packages/core/src/simulation/enemy-combat.ts';
import { createTrainingScene } from '../packages/core/src/index.ts';

test('right-click meter menu switches replicated totals and supports keyboard selection and dismissal', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Blade');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()][0];
  const player = [...world.players.values()][0];
  player.autoAttack = false;
  player.partyId = randomUUID();
  const healer = { ...player, id: randomUUID(), name: 'Willow', classId: 'druid' };
  const outsider = { ...healer, id: randomUUID(), name: 'Outsider', partyId: undefined };
  world.players.set(healer.id, healer);
  world.players.set(outsider.id, outsider);
  player.hitpoints -= 10;
  heal(player, 1, healer, Date.now());
  healer.hitpoints -= 5;
  heal(healer, 1, player, Date.now());
  outsider.hitpoints -= 20;
  heal(outsider, 1, outsider, Date.now());
  const scene = createTrainingScene(Date.now());
  scene.enemies = [];
  scene.projectiles = [
    { id: 100, x: player.x, y: player.y, vx: 0, vy: 0, expiresAt: Date.now() + 1000, damage: 3 },
  ];
  tickEnemyCombat(scene, [player], Date.now(), 0, {});
  const received = player.receivedMeter!.total;

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('switch', { name: 'DPS meter', exact: true }).check();
  await page.getByRole('button', { name: 'Close Settings' }).click();
  const meter = page.getByLabel('Damage per second', { exact: true });
  const menu = page.getByRole('menu', { name: 'Meter type' });
  await meter.locator('.damage-meter-row').first().click();
  await meter.locator('header').click({ button: 'right' });
  await expect(menu.getByRole('menuitem')).toHaveText([
    'Damage done',
    'Healing done',
    'Damage received',
  ]);
  await meter.screenshot({ path: 'test-results/dps-meter-menu-panel.png' });
  await page.screenshot({ path: 'test-results/dps-meter-menu.png' });
  await page.keyboard.press('Escape');
  await expect(menu).not.toBeVisible();
  await expect(meter).toContainText('Abilities');
  await meter.click({ button: 'right' });
  await menu.getByRole('menuitem', { name: 'Healing done', exact: true }).click();
  await expect(meter.locator('header')).toContainText('Healing done');
  const rows = meter.locator('.damage-meter-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.first()).toContainText('Willow');
  await expect(rows.first()).toContainText('10 /');
  await expect(rows.first()).toContainText('66.7%');
  await expect(rows.nth(1)).toContainText('5 /');
  await expect(meter).not.toContainText('Outsider');
  await meter.screenshot({ path: 'test-results/dps-meter-healing.png' });

  const picker = meter.getByRole('button', { name: 'Choose meter type' });
  await picker.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('End');
  await page.keyboard.press('Enter');
  await expect(meter.locator('header')).toContainText('Damage received');
  await expect(rows.first()).toContainText('Blade');
  await expect(rows.first()).toContainText(`${received} /`);
  await expect(rows.first()).toContainText('100.0%');
  await meter.screenshot({ path: 'test-results/dps-meter-received.png' });
  await picker.click();
  await page.mouse.click(10, 10);
  await expect(menu).not.toBeVisible();
  await expect(meter.locator('header')).toContainText('Damage received');
  await expect(picker).toBeFocused();
  await meter.click({ button: 'right' });
  await menu.getByRole('menuitem', { name: 'Damage done', exact: true }).click();
  await expect(meter.locator('header')).toContainText('Damage done');
  await expect(meter.locator('button.damage-meter-row')).toHaveCount(2);
});
