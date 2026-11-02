import { slotViews } from './slot-views.ts';

export const SLOT_POSITIONS = Object.fromEntries(
  slotViews.map((slot) => {
    return [slot.id, slot.position];
  }),
);
