import { test, expect } from './fixtures';
import {
  TRAINING_ZONES,
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

    const world = [...game.runtime.worlds.values()].find((world) => {
      return world.players.size === 2;
    })!;
    const healer = [...world.players.values()].find((player) => {
      return player.name === 'Healer';
    })!;
    const patient = [...world.players.values()].find((player) => {
      return player.name === 'Patient';
    })!;

    for (const player of [healer, patient]) {
      Object.assign(player, {
        x: TRAINING_ZONES[0].x,
        y: TRAINING_ZONES[0].y,
        partyId: 'healing-test',
        autoAttack: false,
      });
    }

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
    await expect(
      page.getByRole('button', { name: 'Choose ability for slot 1: Mending Seed' }),
    ).toBeVisible();
    healer.hitpoints = healer.maxHitpoints * 0.8;
    patient.hitpoints = patient.maxHitpoints * 0.2;
    const before = patient.hitpoints;
    await page.keyboard.press('1');
    await expect
      .poll(() => {
        return patient.hitpoints;
      })
      .toBe(before + patient.maxHitpoints * 0.12);
    expect(healer.hitpoints).toBe(healer.maxHitpoints * 0.8);
    await expect
      .poll(() => {
        return healer.bear;
      })
      .toBeTruthy();
    healer.bear!.hitpoints = healer.bear!.maxHitpoints * 0.1;
    const bearBefore = healer.bear!.hitpoints;
    healer.talentCooldowns = {};
    await page.keyboard.press('1');
    await expect
      .poll(() => {
        return healer.bear!.hitpoints;
      })
      .toBe(bearBefore + healer.bear!.maxHitpoints * 0.12);
    expect(patient.hitpoints).toBe(before + patient.maxHitpoints * 0.12);
    await expect(other.locator('.party')).toContainText('Healer');
    await page.getByRole('button', { name: 'Talents' }).click();
    await page.locator(`[data-talent-node='${nodeId}']`).hover();
    await expect(page.getByRole('tooltip').filter({ hasText: 'Mending Seed' })).toContainText(
      'selected by Defensive Tactics',
    );
    await expect(page.getByRole('tooltip').filter({ hasText: 'Mending Seed' })).toContainText(
      'party member or Bear',
    );
    await page.screenshot({ path: 'test-results/party-healing-tooltip.png' });
  } finally {
    await context.close();
  }
});
