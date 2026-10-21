import { game } from '../../game.ts';
export const TRANSIENT_EFFECTS = Object.freeze(
  Object.fromEntries(game.registries.effects.values().map((entry) => [entry.id, entry.value])),
) as unknown as typeof import('../../mods/base/effects/transient.ts').TRANSIENT_EFFECTS;
