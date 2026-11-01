import type { Player } from '@emberfall/common';

function inventoryInputs(player: Player) {
  return [
    player.classId,
    player.autoTarget,
    player.equipment,
    player.equipmentItems,
    player.talents,
    player.backpack,
    player.coins,
  ];
}

/** Compare the bounded inventory data, excluding frequently changing movement and combat state. */
export function sameInventoryPlayer(previous: Player, next: Player) {
  return JSON.stringify(inventoryInputs(previous)) === JSON.stringify(inventoryInputs(next));
}
