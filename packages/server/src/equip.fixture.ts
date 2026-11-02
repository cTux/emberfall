import { instance } from './instance.fixture.ts';
import type { Player } from '@emberfall/common';
import type { ItemStat } from '@emberfall/core';

export function equip(player: Player, slot: string, itemId: string, stat: ItemStat) {
  const item = instance(itemId, stat);
  player.equipment = { ...player.equipment, [slot]: itemId };
  player.equipmentItems = { ...player.equipmentItems, [slot]: item };

  return item;
}
