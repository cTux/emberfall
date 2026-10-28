import { test, expect } from './fixtures';
import {
  TRAINING_ZONES,
  BULLSEYE,
  CLASS_IDS,
  TALENT_TREE,
  TALENT_COLUMNS,
  starterEquipment,
  learnTalent,
  equipTalent,
  talentNodeId,
} from '../packages/core/src/index.ts';

test('Mending Seed heals a party teammate through the server and shows its targeting tooltip', async ({
  page,
  browser,
  game,
}) => {
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const other = await context.newPage();
  try {
    for (const [client, name] of [
      [page, 'Healer'],
      [other, 'Patient'],
    ] as const) {
      await client.goto('/');
      await client.getByLabel('Your adventurer name').fill(name);
      await client.getByRole('button', { name: /^Join Playtest Default/ }).click();
      await expect(client.getByRole('button', { name: 'Leave world' })).toBeVisible();
    }
    const world = [...game.runtime.worlds.values()].find((world) => world.players.size === 2)!;
    const healer = [...world.players.values()].find((player) => player.name === 'Healer')!;
    const patient = [...world.players.values()].find((player) => player.name === 'Patient')!;
    for (const player of [healer, patient])
      Object.assign(player, {
        x: TRAINING_ZONES[0].x,
        y: TRAINING_ZONES[0].y,
        partyId: 'healing-test',
        autoAttack: false,
      });
    Object.assign(healer, {
      classId: 'druid',
      level: 20,
      equipment: starterEquipment('druid'),
      talents: {},
      talentSlots: [],
    });
    const nodeId = talentNodeId('druid', 2, 1);
    learnTalent(healer, nodeId);
    equipTalent(healer, 0, nodeId);
    await expect(page.getByRole('button', { name: 'Cast Mending Seed (1)' })).toBeVisible();
    healer.hitpoints = healer.maxHitpoints * 0.8;
    patient.hitpoints = patient.maxHitpoints * 0.2;
    const before = patient.hitpoints;
    await page.keyboard.press('1');
    await expect.poll(() => patient.hitpoints).toBe(before + patient.maxHitpoints * 0.12);
    expect(healer.hitpoints).toBe(healer.maxHitpoints * 0.8);
    await expect(other.locator('.party')).toContainText('Healer');
    await page.getByRole('button', { name: 'Talents (N)' }).click();
    await page.locator(`[data-talent-node='${nodeId}']`).hover();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Mending Seed' })).toContainText(
      'lowest health percentage within 700 units',
    );
    await page.screenshot({ path: 'test-results/party-healing-tooltip.png' });
  } finally {
    await context.close();
  }
});

test('three independent columns support rank learning, custom tooltips, RMB assignment, casts and saved loadouts', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Talent hero');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  await page.getByRole('button', { name: 'Talents (N)' }).click();
  const tree = page.getByRole('region', { name: 'Talents', exact: true });
  await expect(tree.locator('[data-talent-node]')).toHaveCount(30);
  await expect(tree.getByRole('status')).toHaveText('1 talent point available');
  const wounds = tree.locator('[data-talent-node="v2:warrior:1:0"]');
  await wounds.hover();
  await expect(page.getByRole('tooltip').filter({ hasText: 'Open Wounds' })).toContainText(
    'Add 20 / 35 percentage points',
  );
  await wounds.click();
  await expect(wounds).toHaveAccessibleName(/rank 1 of 2/);
  player.level = 20;
  await expect(tree.getByRole('status')).toHaveText('19 talent points available');
  const cleave = tree.locator('[data-talent-node="v2:warrior:0:1"]');
  await cleave.click();
  await expect(cleave).toHaveAccessibleName(/rank 1 of 2/);
  await cleave.click();
  await expect(cleave).toHaveAccessibleName(/rank 2 of 2/);
  await expect(cleave).toHaveAttribute('aria-disabled', 'true');
  await page.screenshot({ path: 'test-results/talents-desktop.png' });
  await page.setViewportSize({ width: 390, height: 740 });
  await expect(tree).toBeVisible();
  expect((await tree.boundingBox())!.width).toBeLessThanOrEqual(390);
  await page.screenshot({ path: 'test-results/talents-narrow.png' });
  await page.keyboard.press('n');
  const bar = page.getByRole('region', { name: 'Action bar', exact: true });
  await bar.getByRole('button', { name: 'Empty ability slot 1' }).click({ button: 'right' });
  await page.getByRole('menuitem', { name: 'Cleaving Strike', exact: true }).click();
  const cast = bar.getByRole('button', { name: 'Cast Cleaving Strike (1)' });
  await expect(cast).toBeVisible();
  player.x = TRAINING_ZONES[0].x;
  player.y = TRAINING_ZONES[0].y;
  await page.mouse.move(190, 350);
  await page.keyboard.press('1');
  await expect.poll(() => player.talentCooldowns?.['talent:warrior:0'] ?? 0).toBeGreaterThan(0);
  await expect(cast).toHaveAttribute('aria-disabled', 'true');
  await cast.click({ button: 'right' });
  await expect(page.getByRole('menuitem', { name: 'Cleaving Strike', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Cast Cleaving Strike (1)' })).toBeVisible();
  player.x = BULLSEYE!.x;
  player.y = BULLSEYE!.y - 15;
  player.coins = 100;
});

test('all class columns, generated icons and confirmed cast effects render in the game', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Talent artwork');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((entry) => entry.players.size)!;
  const player = [...world.players.values()][0];
  for (const classId of CLASS_IDS) {
    Object.assign(player, {
      classId,
      level: 20,
      talents: {},
      talentSlots: [null, null, null, null],
      talentVersion: 2,
      equipment: starterEquipment(classId),
      x: TRAINING_ZONES[0].x,
      y: TRAINING_ZONES[0].y - 15,
    });
    for (const node of TALENT_TREE.filter(
      (node) => node.classId === classId && node.kind === 'ability',
    ))
      learnTalent(player, node.id);
    await page.getByRole('button', { name: 'Talents (N)' }).click();
    const tree = page.getByRole('region', { name: 'Talents', exact: true });
    for (const column of TALENT_COLUMNS[classId])
      await expect(tree.getByText(column, { exact: true })).toBeVisible();
    await expect(tree.locator('[data-talent-node]')).toHaveCount(30);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `test-results/talents-${classId}.png` });
    await page.keyboard.press('n');
    for (let column = 0; column < 3; column++) {
      const node = TALENT_TREE.find(
        (node) => node.classId === classId && node.column === column && node.row === 1,
      )!;
      equipTalent(player, 0, node.id);
      player.talentCooldowns = {};
      await expect(page.getByRole('button', { name: `Cast ${node.name} (1)` })).toBeVisible();
      await page.mouse.move(780, 480);
      const before = world.training?.sequence ?? 0;
      await page.keyboard.press('1');
      await expect
        .poll(() =>
          world.training?.explosions?.some(
            (effect) =>
              effect.id > before &&
              effect.talentClass === classId &&
              effect.talentColumn === column,
          ),
        )
        .toBe(true);
      await page.screenshot({ path: `test-results/talent-cast-${classId}-${column}.png` });
    }
  }
});
