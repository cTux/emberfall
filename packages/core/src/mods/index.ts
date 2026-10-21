import { baseMod } from './base.mod.ts';
import type { GameMod } from '../content/contracts.ts';
/** Add trusted bundled modules here, in deterministic registration order. */
export const GAME_MODS: readonly GameMod[] = Object.freeze([baseMod]);
export { baseMod };
