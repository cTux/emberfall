import { PLAYER_DEFINITIONS, INITIAL_PROGRESS } from "./entities/players.ts";
import {
  ENEMY_HP,
  ENEMY_STATS,
  ENEMY_RULES,
  ENEMY_HEALTH_MULTIPLIERS,
  BOSS_DEFINITIONS,
} from "./entities/enemies.ts";
import { FOREST_ENCOUNTER } from "./encounters/forest.ts";
import { BEAR_DEFINITION } from "./entities/companions.ts";
import { PICKUP_DEFINITIONS, PICKUP_RULES } from "./entities/pickups.ts";
import { ATTACK_DEFINITIONS } from "./abilities/attacks.ts";
import { AILMENT_DEFINITIONS } from "./effects/ailments.ts";
import { TRAINING_DEFINITION } from "./encounters/training.ts";
import { VILLAGE_DEFINITION } from "./worlds/village.ts";
import { FOREST_DEFINITION } from "./worlds/forest.ts";
import { RUNTIME } from "./runtime.ts";
import { CRITTER_DEFINITIONS, VILLAGE_CRITTERS } from "./entities/critters.ts";
import { TRANSIENT_EFFECTS } from "./effects/transient.ts";
import { GEAR_DEFINITIONS, SLOT_GEAR_TYPES, STARTER_WEAPONS } from "./equipment.ts";

export const GAME_DEFINITIONS = {
  equipment: { items: GEAR_DEFINITIONS, slots: SLOT_GEAR_TYPES, starters: STARTER_WEAPONS },
  players: PLAYER_DEFINITIONS,
  initialProgress: INITIAL_PROGRESS,
  enemies: {
    archetypes: ENEMY_STATS,
    health: ENEMY_HP,
    rules: ENEMY_RULES,
    healthMultipliers: ENEMY_HEALTH_MULTIPLIERS,
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

/** Definitions must remain portable data, with valid references and shared wrap geometry. */
export function validateDefinitions() {
  function plain(value: unknown, path: string) {
    if (value === null || typeof value === "string" || typeof value === "boolean") return;
    if (typeof value === "number" && Number.isFinite(value)) return;
    if (Array.isArray(value)) {
      value.forEach((v, i) => plain(v, `${path}.${i}`));
      return;
    }
    if (typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
      for (const [key, child] of Object.entries(value)) plain(child, `${path}.${key}`);
      return;
    }
    throw new Error(`Definition ${path} is not serializable data`);
  }
  plain(GAME_DEFINITIONS, "definitions");
  for (const id of Object.values(STARTER_WEAPONS)) {
    if (!GEAR_DEFINITIONS[id]?.damageType || !GEAR_DEFINITIONS[id]?.stats.attacksPerSecond)
      throw new Error(`Invalid starter weapon ${id}`);
  }
  if (!(FOREST_ENCOUNTER.boss in BOSS_DEFINITIONS)) throw new Error("Invalid forest boss");
  for (const boss of Object.values(BOSS_DEFINITIONS)) {
    if (!(boss.archetype in ENEMY_STATS)) throw new Error(`Invalid boss archetype ${boss.id}`);
  }
  for (const player of Object.values(PLAYER_DEFINITIONS)) {
    if (!(player.attack in ATTACK_DEFINITIONS) || !(player.ailment in AILMENT_DEFINITIONS))
      throw new Error(`Invalid references in ${player.id}`);
    if ("companion" in player && !(player.companion in GAME_DEFINITIONS.companions))
      throw new Error(`Invalid companion in ${player.id}`);
  }
  for (const world of Object.values(GAME_DEFINITIONS.worlds)) {
    if (
      world.geometry.width !== FOREST_DEFINITION.geometry.width ||
      world.geometry.height !== FOREST_DEFINITION.geometry.height
    )
      throw new Error("Village and forest must share wrapping geometry");
  }
  for (const attack of Object.values(ATTACK_DEFINITIONS)) {
    if (attack.range <= 0 || attack.damage < 0) throw new Error(`Invalid attack ${attack.id}`);
  }
}
