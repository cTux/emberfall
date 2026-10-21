import { game } from '../game.ts';
import { PLAYER_DEFINITIONS, INITIAL_PROGRESS } from './entities/players.ts';
import { ENEMY_STATS, ENEMY_RULES, BOSS_DEFINITIONS } from './entities/enemies.ts';
import { FOREST_ENCOUNTER } from './encounters/forest.ts';
import { BEAR_DEFINITION } from './entities/companions.ts';
import { PICKUP_DEFINITIONS, PICKUP_RULES } from './entities/pickups.ts';
import { ATTACK_DEFINITIONS } from './abilities/attacks.ts';
import { AILMENT_DEFINITIONS } from './effects/ailments.ts';
import { TRAINING_DEFINITION } from './encounters/training.ts';
import { VILLAGE_DEFINITION } from './worlds/village.ts';
import { FOREST_DEFINITION } from './worlds/forest.ts';
import { RUNTIME } from './runtime.ts';
import { CRITTER_DEFINITIONS, VILLAGE_CRITTERS } from './entities/critters.ts';
import { TRANSIENT_EFFECTS } from './effects/transient.ts';
import { GEAR_DEFINITIONS, SLOT_GEAR_TYPES, STARTER_WEAPONS } from './equipment.ts';

export const GAME_DEFINITIONS = {
  equipment: { items: GEAR_DEFINITIONS, slots: SLOT_GEAR_TYPES, starters: STARTER_WEAPONS },
  players: PLAYER_DEFINITIONS,
  initialProgress: INITIAL_PROGRESS,
  enemies: {
    archetypes: ENEMY_STATS,
    rules: ENEMY_RULES,
    bosses: BOSS_DEFINITIONS,
  },
  encounters: { forest: FOREST_ENCOUNTER },
  companions: { bear: BEAR_DEFINITION },
  pickups: PICKUP_DEFINITIONS,
  pickupRules: PICKUP_RULES,
  attacks: ATTACK_DEFINITIONS,
  ailments: AILMENT_DEFINITIONS,
  training: TRAINING_DEFINITION,
  critters: CRITTER_DEFINITIONS,
  villageCritters: VILLAGE_CRITTERS,
  effects: TRANSIENT_EFFECTS,
  worlds: { village: VILLAGE_DEFINITION, forest: FOREST_DEFINITION },
  runtime: RUNTIME,
} as const;

export function validateDefinitions() {
  return game.status === 'ready';
}
