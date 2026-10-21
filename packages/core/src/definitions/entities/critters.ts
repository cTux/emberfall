import { game } from '../../game.ts';
import { setting } from '../../content/views.ts';
export const CRITTER_DEFINITIONS = Object.freeze(
  Object.fromEntries(game.registries.critters.entries()),
);
export const VILLAGE_CRITTERS = setting<
  typeof import('../../mods/base/entities/critters.ts').VILLAGE_CRITTERS
>('villageCritters') as { x: number; y: number; kind: CritterKind }[];
export type CritterKind = 'cat' | 'chicken' | 'raccoon';
