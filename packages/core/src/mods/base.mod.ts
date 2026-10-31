import { TALENT_ABILITIES } from './base/abilities/talents.ts';
import { BASE_CLASS_DETAILS } from './base/class-details.ts';
import type { GameMod, AbilityDefinition, AilmentDefinition } from '../content/contracts.ts';
import {
  GEAR_DEFINITIONS,
  EQUIPMENT_SLOTS,
  SLOT_GEAR_TYPES,
  CLASS_GEAR_TYPES,
  STARTER_WEAPONS,
  INNATE_STATS,
  LOOT_ITEM_IDS,
} from './base/equipment.ts';
import {
  PLAYER_DEFINITIONS,
  INITIAL_PROGRESS,
  PLAYER_BODY_RADIUS,
} from './base/entities/players.ts';
import { ATTACK_DEFINITIONS } from './base/abilities/attacks.ts';
import { ENEMY_STATS, ENEMY_RULES, BOSS_DEFINITIONS } from './base/entities/enemies.ts';
import { BEAR_DEFINITION } from './base/entities/companions.ts';
import { AILMENT_DEFINITIONS } from './base/effects/ailments.ts';
import { PICKUP_DEFINITIONS, PICKUP_RULES } from './base/entities/pickups.ts';
import { CRITTER_DEFINITIONS, VILLAGE_CRITTERS } from './base/entities/critters.ts';
import { TRANSIENT_EFFECTS } from './base/effects/transient.ts';
import { FOREST_ENCOUNTER } from './base/encounters/forest.ts';
import { TRAINING_DEFINITION } from './base/encounters/training.ts';
import { VILLAGE_DEFINITION } from './base/worlds/village.ts';
import { FOREST_DEFINITION, LOBBY_PORTAL, INTERACTION_RADIUS } from './base/worlds/forest.ts';
import { RUNTIME } from './base/runtime.ts';
import { COLLISION } from './base/collision.ts';

const gearLabels: Record<string, string> = {
  sword: 'Sword',
  bow: 'Bow',
  fireStaff: 'Fire staff',
  natureStaff: 'Nature staff',
  gloves: 'Gloves',
  helmet: 'Helmet',
  bodyArmor: 'Body armor',
  leggings: 'Leggings',
  boots: 'Boots',
  amulet: 'Amulet',
  ring: 'Ring',
  shield: 'Shield',
  quiver: 'Quiver',
  orb: 'Mage orb',
  natureFocus: 'Nature focus',
};
const slotLabels = [
  'Weapon',
  'Gloves',
  'Helmet',
  'Body armor',
  'Leggings',
  'Boots',
  'Amulet',
  'Off-hand',
  'Ring',
];
const slotPositions = [
  [1, 2],
  [1, 3],
  [2, 1],
  [2, 2],
  [2, 3],
  [2, 4],
  [3, 1],
  [3, 2],
  [3, 3],
];
const attributes: Record<string, number[]> = {
  skeleton: [10, 3],
  runner: [10, 3],
  brute: [30, 9],
  caster: [7, 3],
};
export const baseMod: GameMod = {
  id: 'base',
  register(r) {
    for (const id of new Set(Object.values(SLOT_GEAR_TYPES).flat())) {
      r.gearTypes.register({ id, label: gearLabels[id] });
    }

    EQUIPMENT_SLOTS.forEach((id, index) => {
      return r.slots.register({
        id,
        label: slotLabels[index],
        gearTypes: SLOT_GEAR_TYPES[id],
        classRestricted: id === 'weapon' || id === 'offHand',
        column: slotPositions[index][0],
        row: slotPositions[index][1],
      });
    });

    for (const [id, value] of Object.entries(INNATE_STATS)) {
      r.stats.register({
        id,
        label: id.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => {
          return c.toUpperCase();
        }),
        default: value,
        aggregation: 'sum',
        format: id === 'criticalChance' || id === 'criticalMultiplier' ? 'percent' : 'number',
      });
    }

    for (const item of Object.values(GEAR_DEFINITIONS)) {
      r.items.register({ ...item, kind: 'gear', loot: LOOT_ITEM_IDS.includes(item.id) });
    }

    r.items.register({
      id: 'health-potion',
      name: 'Health potion',
      kind: 'consumable',
      price: 1,
      healing: 25,
    });

    for (const [id, name] of Object.entries({
      'empty-bottle': 'Empty bottle',
      log: 'Log',
      stick: 'Stick',
      leaf: 'Leaf',
      rock: 'Rock',
      stone: 'Stone',
      plant: 'Plant',
      fern: 'Fern',
      'berry-bush': 'Berry bush',
      'meadow-grass': 'Meadow grass',
      'violet-wildflowers': 'Violet wildflowers',
      'flowering-herb': 'Flowering herb',
    })) {
      r.items.register({ id, name, kind: 'resource', price: 1 });
    }

    for (const player of Object.values(PLAYER_DEFINITIONS)) {
      r.classes.register({
        ...player,
        details: BASE_CLASS_DETAILS[player.id],
        art: player.id,
        starterWeapon: STARTER_WEAPONS[player.id],
        gearTypes: CLASS_GEAR_TYPES[player.id],
      });
    }

    for (const [id, ability] of Object.entries(ATTACK_DEFINITIONS)) {
      r.abilities.register({
        intervalMs: 1000,
        durationMs: 260,
        aimSmoothingSeconds: 0.08,
        manualRange: ability.range,
        speed: 0,
        count: 0,
        spreadRadians: 0,
        piercing: false,
        splashRadius: 0,
        splashDamage: 0,
        bounces: 0,
        bounceRadius: 0,
        ...ability,
        kind: id,
      } as AbilityDefinition);
    }

    for (const ability of TALENT_ABILITIES) {
      r.abilities.register(ability);
    }

    for (const [id, enemy] of Object.entries(ENEMY_STATS)) {
      r.enemies.register({
        ...enemy,
        id,
        art: id,
        behavior: id === 'caster' ? 'ranged' : 'melee',
        hitPoints: attributes[id][0],
        damage: attributes[id][1],
      } as Parameters<typeof r.enemies.register>[0]);
    }

    r.spawnRules.register({ id: 'brute', enemy: 'brute', chance: ENEMY_RULES.bruteChance });
    r.spawnRules.register({ id: 'caster', enemy: 'caster', chance: ENEMY_RULES.casterChance });
    r.settings.register({ id: 'spawnFallbacks', value: ['runner', 'skeleton'] });

    for (const boss of Object.values(BOSS_DEFINITIONS)) {
      r.bosses.register(boss);
    }

    r.companions.register(BEAR_DEFINITION);

    for (const [id, ailment] of Object.entries(AILMENT_DEFINITIONS)) {
      r.ailments.register({
        chance: 0,
        tickMs: 1000,
        damagePerStack: 0,
        ...ailment,
        id,
        kind: id,
      } as AilmentDefinition);
    }

    for (const [id, value] of Object.entries(PICKUP_DEFINITIONS)) {
      r.pickups.register({ id, value });
    }

    for (const critter of Object.values(CRITTER_DEFINITIONS)) {
      r.critters.register(critter);
    }

    for (const [id, value] of Object.entries(TRANSIENT_EFFECTS)) {
      r.effects.register({ id, value });
    }

    r.encounters.register({ id: 'forest', value: FOREST_ENCOUNTER });
    r.encounters.register({ id: 'training', value: TRAINING_DEFINITION });
    r.worlds.register({ id: 'village', value: VILLAGE_DEFINITION });
    r.worlds.register({ id: 'forest', value: FOREST_DEFINITION });

    for (const [id, value] of Object.entries({
      runtime: RUNTIME,
      collision: COLLISION,
      initialProgress: INITIAL_PROGRESS,
      playerBodyRadius: PLAYER_BODY_RADIUS,
      enemyRules: ENEMY_RULES,
      pickupRules: PICKUP_RULES,
      villageCritters: VILLAGE_CRITTERS,
      lobbyPortal: LOBBY_PORTAL,
      interactionRadius: INTERACTION_RADIUS,
    })) {
      r.settings.register({ id, value });
    }

    r.enemyTypes.register({
      id: 'normal',
      multiplier: 1,
      dropChance: 4,
      dropCount: 1,
      spawnChance: 100,
    });
    r.enemyTypes.register({
      id: 'elite',
      multiplier: 3,
      dropChance: 15,
      dropCount: { min: 50, max: 150 },
      spawnChance: 5,
    });
    r.enemyTypes.register({
      id: 'boss',
      multiplier: 10,
      dropChance: 50,
      dropCount: { min: 100, max: 500 },
    });

    for (const [id, balance] of Object.entries({
      Easy: { multiplier: 1, speedMultiplier: 1 },
      Medium: { multiplier: 2, speedMultiplier: 1.05 },
      Hard: { multiplier: 4, speedMultiplier: 1.15 },
    })) {
      r.difficulties.register({ id, ...balance });
    }
  },
};
