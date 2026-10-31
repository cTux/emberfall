import { createGame } from '../create-game.ts';
import { baseMod } from '../../mods/base.mod.ts';

import type { GameMod } from '../contracts.ts';

export const compose = (mod: GameMod) => {
  return createGame([baseMod, mod]);
};
