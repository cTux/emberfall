import { checkWeaponBadges } from './equipment-badge-checks.ts';
import { test, expect } from './fixtures';
import { CLASS_IDS, CLASS_LABELS, WARDROBE, starterEquipment } from '../packages/core/src/index.ts';

test('equipment shows all class starters and stats; physical I, tooltips, dragging and responsive layout work', async ({
  page,
  game,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => {
    return errors.push(error.message);
  });
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Gear tester');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const opener = page.getByRole('button', { name: 'Inventory' });
  await expect(opener).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size;
  })!;
  const player = [...world.players.values()][0];
  const dialog = page.getByRole('dialog', { name: 'Inventory', exact: true });
  const physicalI = (key = 'ш', repeat = false) => {
    return page.evaluate(
      ({ key, repeat }) => {
        window.dispatchEvent(
          new KeyboardEvent('keydown', { code: 'KeyI', key, repeat, bubbles: true }),
        );
      },
      { key, repeat },
    );
  };

  await physicalI();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-equipment-slot]')).toHaveCount(9);
  await expect(dialog).not.toContainText(/mana/i);
  await expect(dialog.locator('[data-equipped="true"]')).toHaveCount(1);
  await dialog.getByRole('tab', { name: 'Stats', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Character stats' })).toContainText('150%');
  await dialog.getByRole('tab', { name: 'Equipment', exact: true }).click();
  await physicalI('i', true);
  await expect(dialog).toBeVisible();
  const content = await checkWeaponBadges(page, dialog);
  await page.mouse.move(0, 0);
  await dialog.getByRole('heading', { name: 'Inventory', exact: true }).click();
  await expect(page.getByRole('tooltip')).toBeHidden();
  const gloves = dialog.getByRole('button', { name: 'Gloves: Empty' });
  await page.keyboard.press('Tab');
  await gloves.focus();
  await expect(page.getByRole('tooltip')).toContainText('Accepts: Gloves');
  await expect(gloves.locator('[aria-hidden="true"]').first()).toHaveCSS('opacity', '0.25');
  await dialog.getByRole('heading', { name: 'Inventory', exact: true }).click();
  const before = (await dialog.boundingBox())!;
  const title = (await dialog
    .getByRole('heading', { name: 'Inventory', exact: true })
    .boundingBox())!;
  await page.mouse.move(title.x + 60, title.y + 10);
  await page.mouse.down();
  await page.mouse.move(title.x + 135, title.y + 55, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => {
      return (await dialog.boundingBox())!.x;
    })
    .toBeGreaterThan(before.x + 50);
  const dragged = (await dialog.boundingBox())!;
  await physicalI();
  await expect(dialog).toBeHidden();
  await opener.click();
  await expect(dialog).toBeVisible();
  expect(Math.abs((await dialog.boundingBox())!.x - dragged.x)).toBeLessThan(3);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await physicalI();
  await expect(dialog).toBeHidden();
  await page.keyboard.press('Escape');
  await page.getByRole('complementary', { name: 'World chat', exact: true }).hover();
  const chat = page.getByLabel('Chat message', { exact: true });
  await chat.fill('i');
  await chat.press('i');
  await expect(dialog).toBeHidden();
  await chat.fill('');
  await chat.blur();
  for (const classId of CLASS_IDS) {
    player.x = WARDROBE.x;
    player.y = WARDROBE.y - 15;
    const wardrobe = page.getByRole('dialog', { name: 'Wardrobe' });
    await page.mouse.move(0, 0);
    await expect(page.locator('canvas[aria-label]')).toHaveAttribute(
      'data-interaction-prompt',
      'Wardrobe',
    );
    await page.keyboard.press('e');
    await expect(wardrobe).toBeVisible();
    const choice = wardrobe.getByRole('button', { name: new RegExp(`^${CLASS_LABELS[classId]}`) });
    if (player.classId !== classId) {
      await choice.click();
    }

    await expect
      .poll(() => {
        return player.classId;
      })
      .toBe(classId);
    expect(player.equipment).toEqual(starterEquipment(classId));
    await wardrobe.getByRole('button', { name: 'Close Wardrobe', exact: true }).click();
    await expect(wardrobe).toHaveCount(0);
    await physicalI();
    await expect(dialog.locator('[data-equipped="true"]')).toHaveCount(1);
    const type = { warrior: 'Physical', ranger: 'Poison', mage: 'Fire', druid: 'Nature' }[
      classId as 'warrior' | 'ranger' | 'mage' | 'druid'
    ];
    await dialog.getByRole('tab', { name: 'Stats', exact: true }).click();
    await expect(dialog.getByRole('region', { name: 'Character stats' })).toContainText(type);
    await expect(dialog.getByRole('region', { name: 'Character stats' })).toContainText(
      'Cooldown1 sec',
    );
    await expect(dialog).not.toContainText('Attack speed');
    await dialog.getByRole('tab', { name: 'Equipment', exact: true }).click();
    const weapon = dialog.locator('[data-equipment-slot="weapon"]');
    await weapon.hover();
    const badge = page.locator('[data-equipment-badge="range"]');
    await expect(badge).toHaveAttribute(
      'aria-label',
      `Range: ${(classId === 'warrior' ? 75 : classId === 'ranger' ? 1000 : 250).toLocaleString('en')} units`,
    );
    const effect = { warrior: 'bleed', ranger: 'poison', mage: 'burn', druid: 'roots' }[
      classId as 'warrior' | 'ranger' | 'mage' | 'druid'
    ];
    await page.locator(`[data-equipment-badge="${effect}"]`).last().hover();
    await expect(page.getByRole('tooltip').last()).toContainText(
      classId === 'druid' ? 'Bosses are immune to roots.' : 'new stacks refresh the duration',
    );
    const stats = dialog.getByRole('region', { name: 'Character stats' });
    const automaticRange = { warrior: 75, ranger: 1000, mage: 250, druid: 250 }[
      classId as 'warrior' | 'ranger' | 'mage' | 'druid'
    ];
    const manualRange = classId === 'warrior' ? 75 : 1000;
    await dialog.getByRole('tab', { name: 'Stats', exact: true }).click();
    await expect(stats.getByText('Range', { exact: true })).toHaveCount(1);
    await expect(stats).toContainText(`Range${automaticRange.toLocaleString('en')} units`);
    await expect(stats).not.toContainText('Target range');
    await expect(stats).not.toContainText('Manual range');
    await physicalI();
    await page.keyboard.press('g');
    await expect
      .poll(() => {
        return player.autoTarget;
      })
      .toBe(false);
    await physicalI();
    await dialog.getByRole('tab', { name: 'Stats', exact: true }).click();
    await expect(stats).toContainText(`Range${manualRange.toLocaleString('en')} units`);
    await dialog.getByRole('tab', { name: 'Equipment', exact: true }).click();
    await weapon.hover();
    await expect(page.locator('[data-equipment-badge="range"]')).toHaveAttribute(
      'aria-label',
      `Range: ${manualRange.toLocaleString('en')} units`,
    );
    await physicalI();
    await page.keyboard.press('g');
    await expect
      .poll(() => {
        return player.autoTarget;
      })
      .toBe(true);
    await physicalI();
    await dialog.getByRole('tab', { name: 'Stats', exact: true }).click();
    await expect(stats).toContainText(`Range${automaticRange.toLocaleString('en')} units`);
    await dialog.getByRole('tab', { name: 'Equipment', exact: true }).click();
    await weapon.hover();
    await expect(page.locator(`[data-equipment-badge="${effect}"]`).last()).toBeVisible();
    expect(
      await content.evaluate((node) => {
        return node.scrollHeight <= node.clientHeight;
      }),
    ).toBe(true);
    await page.screenshot({ path: `test-results/equipment-${classId}.png` });
    await dialog.getByRole('button', { name: 'Close Inventory', exact: true }).click();
    await expect(dialog).toHaveCount(0);
  }

  await opener.click();
  for (const width of [1280, 1024]) {
    await page.setViewportSize({ width, height: 800 });
    await expect(dialog).toBeVisible();
    await expect
      .poll(async () => {
        return (await dialog.boundingBox())!.x;
      })
      .toBeGreaterThanOrEqual(0);
    await expect
      .poll(async () => {
        const box = (await dialog.boundingBox())!;

        return box.x + box.width;
      })
      .toBeLessThanOrEqual(width);
    await dialog.getByRole('tab', { name: 'Stats', exact: true }).click();
    await dialog.getByText('Damage reduction', { exact: true }).scrollIntoViewIfNeeded();
    await expect(dialog.getByText('Damage reduction', { exact: true })).toBeVisible();
    await dialog.getByRole('tab', { name: 'Equipment', exact: true }).click();
    await dialog.locator('[data-equipment-slot="weapon"]').hover();
    await page.getByRole('button', { name: 'Roots', exact: true }).hover();
    await expect(page.getByRole('tooltip').last()).toContainText('Bosses are immune to roots.');
    for (const tooltip of await page.getByRole('tooltip').all()) {
      const box = (await tooltip.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
    }
  }

  await page.screenshot({ path: 'test-results/equipment-narrow.png' });
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  // Fixture-arranged forest still uses real replicated gear and the same window.
  game.runtime.parties(world).run([...world.players.values()][0]).scene = {
    ...world.training!,
    id: 'equipment-forest',
    electorate: '',
    training: false,
    enemies: [],
    endsAt: Date.now() + 60000,
    nextSpawn: Date.now() + 60000,
  };
  player.scene = 'forest';
  player.equipment = {};
  await expect(page.getByRole('status').filter({ hasText: /Forest/ })).toBeVisible();
  await physicalI();
  await expect(dialog).toBeVisible();
  await expect(dialog.locator('[data-equipped="true"]')).toHaveCount(0);
  await dialog.getByRole('tab', { name: 'Stats', exact: true }).click();
  await expect(dialog.getByRole('region', { name: 'Character stats' })).toContainText('Power0');
  expect(errors).toEqual([]);
});
