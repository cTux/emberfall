import { createGame } from './content/create-game.ts';
import { GAME_MODS } from './mods/index.ts';
/** Composition finishes before any content-dependent module or host can start. */
export const game = createGame(GAME_MODS);
export { createGame };
