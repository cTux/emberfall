import { game } from '../game.ts';

export const GEAR_DEFINITIONS = Object.freeze(
  Object.fromEntries(
    game.registries.items
      .values()
      .filter((item) => {
        return item.kind === 'gear';
      })
      .map((item) => {
        return [item.id, item];
      }),
  ),
);
