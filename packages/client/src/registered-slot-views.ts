import { equipmentSlotArt } from './equipment-slot-art.ts';
import { type createGame, game } from '@emberfall/core';
import { clientAsset } from './urls.ts';

export function registeredSlotViews(context: ReturnType<typeof createGame> = game) {
  return context.registries.slots.values().map((slot) => {
    return {
      id: slot.id,
      label: slot.label,
      position: { column: slot.column, row: slot.row },
      icon: clientAsset(`/assets/wardrobe-style/${equipmentSlotArt(slot.id)}.png`),
    };
  });
}
