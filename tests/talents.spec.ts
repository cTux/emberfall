import { test, expect } from './fixtures';
import {
  TRAINING_ZONES,
  CLASS_IDS,
  TALENT_TREE,
  TALENT_COLUMNS,
  starterEquipment,
  learnTalent,
  equipTalent,
  talentNodeId,
} from '../packages/core/src/index.ts';

import './talents-healing.cases.ts';
import './talents-window.cases.ts';
test('learning Pack Howl enlarges Bear without casting and shows the permanent bonus', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Pack Howl');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  await expect(page.getByRole('button', { name: 'Leave world' })).toBeVisible();
  const world = [...game.runtime.worlds.values()].find((world) => {
    return world.players.size === 1;
  })!;
  const player = [...world.players.values()][0];
  Object.assign(player, {
    classId: 'druid',
    level: 20,
    equipment: starterEquipment('druid'),
    talents: {},
    talentSlots: [null, null, null, null],
    autoAttack: false,
  });
  await expect
    .poll(() => {
      return player.bear?.size;
    })
    .toBe(48);
  const baseHealth = player.bear!.maxHitpoints;
  await page.waitForTimeout(1500); // Let scene artwork finish loading before the comparison capture.
  await page.screenshot({ path: 'test-results/pack-howl-before.png' });
  learnTalent(player, talentNodeId('druid', 1, 3));
  await expect
    .poll(() => {
      return player.bear?.size;
    })
    .toBe(96);
  await expect
    .poll(() => {
      return player.bear?.maxHitpoints;
    })
    .toBe(baseHealth * 1.3);
  expect(player.bear!.range).toBe(97.5);
  await page.waitForTimeout(300); // Allow the confirmed snapshot to reach the renderer.
  await page.screenshot({ path: 'test-results/pack-howl-learned.png' });
  await page.getByRole('button', { name: 'Talents', exact: true }).click();
  const card = page.locator(`[data-talent-node='${talentNodeId('druid', 1, 3)}']`);
  await card.hover();
  await expect(page.getByRole('tooltip', { name: /^Pack Howl/ })).toContainText(
    'increases its claw range and maximum health by 30%',
  );
});

test('all class columns, generated icons and confirmed cast effects render in the game', async ({
  page,
  game,
}) => {
  await page.goto('/');
  await page.getByLabel('Your adventurer name').fill('Talent artwork');
  await page.getByRole('button', { name: /^Join Playtest Default/ }).click();
  const world = [...game.runtime.worlds.values()].find((entry) => {
    return entry.players.size;
  })!;
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

    for (const node of TALENT_TREE.filter((node) => {
      return node.classId === classId && node.kind === 'ability';
    })) {
      learnTalent(player, node.id);
    }

    await page.getByRole('button', { name: 'Talents' }).click();
    const tree = page.getByRole('region', { name: 'Talents', exact: true });

    for (const column of TALENT_COLUMNS[classId]) {
      await expect(tree.getByText(column, { exact: true })).toBeVisible();
    }

    await expect(tree.locator('[data-talent-node]')).toHaveCount(30);

    for (const node of TALENT_TREE.filter((node) => {
      return node.classId === classId;
    })) {
      const icon = tree.locator(`[data-talent-node="${node.id}"] > div`).first();
      await expect(icon).toHaveCSS('outline-style', node.kind === 'ability' ? 'solid' : 'none');
    }

    // The last authored row is taller than the preceding rows, not a 229px cell.
    const lastIcon = tree.locator(`[data-talent-node="v2:${classId}:2:9"] span[aria-hidden]`);
    const size = await lastIcon.evaluate((element) => {
      return getComputedStyle(element).backgroundSize;
    });
    expect(Number.parseFloat(size.split(' ')[1])).toBeLessThan(550);
    await page.mouse.move(0, 0);
    await page.screenshot({ path: `test-results/talents-${classId}.png` });
    await page.keyboard.press('n');

    for (let column = 0; column < 3; column++) {
      const node = TALENT_TREE.find((node) => {
        return node.classId === classId && node.column === column && node.row === 1;
      })!;
      equipTalent(player, 0, node.id);
      player.talentCooldowns = {};
      await expect(
        page.getByRole('button', { name: `Choose ability for slot 1: ${node.name}` }),
      ).toBeVisible();
      await page.mouse.move(780, 480);
      const before = world.training?.sequence ?? 0;
      await page.keyboard.press('1');
      await expect
        .poll(() => {
          return world.training?.explosions?.some((effect) => {
            return (
              effect.id > before && effect.talentClass === classId && effect.talentColumn === column
            );
          });
        })
        .toBe(true);
      await page.screenshot({ path: `test-results/talent-cast-${classId}-${column}.png` });
    }
  }
});
