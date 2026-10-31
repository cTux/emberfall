import type { BackpackItem, Player, SceneState } from '@emberfall/common';
import {
  Rarity,
  type ItemStat,
  rarityStatCount,
  itemTypeStats,
  itemStatWeight,
  statValue,
  GEAR_DEFINITIONS,
  createTrainingScene,
} from '@emberfall/core';

import { freshProgress } from './characters.ts';

export const hero = (classId = 'warrior', id = 'hero'): Player => ({
  ...freshProgress(classId),
  classId,
  id,
  name: id,
  x: 2400,
  y: 1280,
  color: 0,
  level: 20,
  scene: 'forest',
  autoTarget: false,
  aimX: 3000,
  aimY: 1280,
});

export function instance(
  itemId: string,
  stat: ItemStat,
  rarity: Rarity = Rarity.Legendary,
): BackpackItem {
  const stats: Record<string, number> = {};
  const pool = [stat, ...itemTypeStats[GEAR_DEFINITIONS[itemId].gearType]];
  for (const key of pool) {
    if (Object.keys(stats).length === rarityStatCount[rarity]) break;
    if (rarity !== Rarity.Legendary && itemStatWeight[key] < 1) continue;
    stats[key] = statValue(key, rarity);
  }

  return { id: crypto.randomUUID(), itemId, quantity: 1, rarity, stats };
}

export function equip(player: Player, slot: string, itemId: string, stat: ItemStat) {
  const item = instance(itemId, stat);
  player.equipment = { ...player.equipment, [slot]: itemId };
  player.equipmentItems = { ...player.equipmentItems, [slot]: item };

  return item;
}

export const arena = (training = true): SceneState => ({
  ...createTrainingScene(0),
  id: 'arena',
  training,
  nextSpawn: 1e9,
  endsAt: 1e9,
  enemies: [],
});
