import { game } from '../../game.ts';
import type { Widen } from '../../content/contracts.ts';
export const VILLAGE_DEFINITION = game.registries.worlds.require('village').value as Widen<
  typeof import('../../mods/base/worlds/village.ts').VILLAGE_DEFINITION
>;
export const {
  geometry: ARENA,
  wardrobe: WARDROBE,
  innkeeper: INNKEEPER,
  buildings: BUILDINGS,
  torches: TORCHES,
  trainingZones: TRAINING_ZONES,
  paths: PATH_CURVES,
} = VILLAGE_DEFINITION;
