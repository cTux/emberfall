import { game } from '../game.ts';

export const LOOT_ITEM_IDS = Object.freeze(
  game.registries.items
    .values()
    .filter((item) => {
      return item.kind === 'gear' && item.loot;
    })
    .map((item) => {
      return item.id;
    }),
);
