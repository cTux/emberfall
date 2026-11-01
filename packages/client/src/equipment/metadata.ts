import { PERCENT } from '@emberfall/common';

import { game, STARTER_WEAPONS } from '@emberfall/core';
import type { ClassId } from '@emberfall/common';
import { registeredSlotViews } from '../content-views';

export const slotViews = registeredSlotViews();
export const SLOT_POSITIONS = Object.fromEntries(
  slotViews.map((slot) => {
    return [slot.id, slot.position];
  }),
);
export const SLOT_LABELS = Object.fromEntries(
  game.registries.slots.values().map((slot) => {
    return [slot.id, slot.label];
  }),
);
export const GEAR_LABELS = Object.fromEntries(
  game.registries.gearTypes.values().map((type) => {
    return [type.id, type.label];
  }),
);
export const ITEM_CLASSES = Object.fromEntries(
  Object.entries(STARTER_WEAPONS).map(([id, weapon]) => {
    return [weapon, id];
  }),
) as Record<string, ClassId>;
export const number = (value: number) => {
  return Number.isFinite(value) ? value.toLocaleString('en', { maximumFractionDigits: 2 }) : '—';
};

export const percent = (value: number) => {
  return `${number(value * PERCENT)}%`;
};

export const capitalize = (value: string) => {
  return value[0].toUpperCase() + value.slice(1);
};
