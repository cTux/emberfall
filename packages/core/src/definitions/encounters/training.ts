import { game } from '../../game.ts';
import type { Widen } from '../../content/contracts.ts';
export const TRAINING_DEFINITION = game.registries.encounters.require('training').value as Widen<
  typeof import('../../mods/base/encounters/training.ts').TRAINING_DEFINITION
>;
