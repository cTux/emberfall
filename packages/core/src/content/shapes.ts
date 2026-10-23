import { z } from 'zod';
import type { RegistryName } from './contracts.ts';
const id = z.string().min(1).max(128);
const positive = z.number().finite().positive();
const nonnegative = z.number().finite().nonnegative();
const point = z.object({ x: z.number().finite(), y: z.number().finite() });
const geometry = z.object({ width: positive, height: positive });
const data = z.object({ id, value: z.unknown() });
export const contentShapes: Record<RegistryName, z.ZodType> = {
  items: z.discriminatedUnion('kind', [
    z.object({
      id,
      name: z.string().min(1),
      kind: z.literal('gear'),
      gearType: id,
      stats: z.record(id, z.number().finite()),
      price: nonnegative.int().max(Number.MAX_SAFE_INTEGER).optional(),
      loot: z.boolean().optional(),
      damageType: z.enum(['physical', 'fire', 'poison', 'nature']).optional(),
    }),
    z.object({
      id,
      name: z.string().min(1),
      kind: z.literal('consumable'),
      healing: positive,
      price: nonnegative.int().max(Number.MAX_SAFE_INTEGER).optional(),
    }),
  ]),
  gearTypes: z.object({ id, label: z.string().min(1) }),
  slots: z.object({
    id,
    label: z.string().min(1),
    gearTypes: z.array(id).min(1),
    classRestricted: z.boolean().optional(),
    column: positive.int(),
    row: positive.int(),
  }),
  stats: z.object({
    id,
    label: z.string().min(1),
    default: z.number().finite(),
    aggregation: z.literal('sum'),
    format: z.enum(['number', 'percent']),
  }),
  classes: z.object({
    id,
    label: z.string().min(1),
    attack: id,
    ailment: id,
    companion: id.optional(),
    sprite: z.string().min(1),
    art: z.enum(['warrior', 'ranger', 'mage', 'druid']),
    starterWeapon: id,
    details: z
      .object({
        weapon: z.string(),
        weaponDescription: z.string(),
        spell: z.string(),
        spellDescription: z.string(),
      })
      .optional(),
    gearTypes: z.array(id).min(1),
  }),
  abilities: z.object({
    id,
    name: z.string().min(1).optional(),
    classId: id.optional(),
    talentSlot: nonnegative.int().max(3).optional(),
    powerScale: positive.optional(),
    kind: z.enum(['slash', 'arrow', 'fireball', 'roots']),
    range: positive,
    manualRange: positive,
    damage: nonnegative,
    intervalMs: positive,
    durationMs: positive,
    aimSmoothingSeconds: positive,
    speed: nonnegative,
    count: nonnegative.int(),
    spreadRadians: nonnegative,
    piercing: z.boolean(),
    splashRadius: nonnegative,
    splashDamage: nonnegative,
    bounces: nonnegative.int(),
    bounceRadius: nonnegative,
  }),
  spawnRules: z.object({ id, enemy: id, chance: nonnegative.max(1) }),
  enemies: z.object({
    id,
    behavior: z.enum(['melee', 'ranged']),
    art: z.enum(['skeleton', 'runner', 'brute', 'caster']),
    speed: positive,
    radius: positive,
    size: positive,
    reach: positive,
    windup: positive,
    cooldown: positive,
    hitPoints: positive,
    damage: nonnegative,
  }),
  bosses: z.object({ id, name: z.string().min(1), archetype: id, kind: z.literal('boss') }),
  companions: z.object({
    id,
    name: z.string().min(1),
    sprite: z.string().min(1),
    attack: id,
    damageType: z.enum(['physical', 'fire', 'poison', 'nature']),
    healthMultiplier: positive,
    range: positive,
    huntRadius: positive,
    spacing: nonnegative,
    returnRadius: positive,
    teleportRadius: positive,
    decisionMs: positive,
    resurrectionMs: positive,
  }),
  ailments: z.object({
    id,
    kind: z.enum(['bleed', 'poison', 'burn', 'roots', 'silence']),
    durationMs: positive,
    chance: nonnegative.max(1),
    tickMs: positive,
    damagePerStack: nonnegative,
    slowFraction: nonnegative.max(1).optional(),
    maxStacks: positive.int().optional(),
    affectsBoss: z.boolean().optional(),
  }),
  pickups: data,
  encounters: data,
  worlds: data,
  effects: data,
  settings: data,
  critters: z.object({ id, sprite: z.string().min(1) }),
  enemyTypes: z.object({
    id,
    multiplier: positive,
    dropChance: nonnegative.max(100),
    dropCount: z.union([nonnegative, z.object({ min: nonnegative, max: nonnegative })]),
    spawnChance: nonnegative.max(100).optional(),
  }),
  difficulties: z.object({ id, multiplier: positive }),
};
export const worldShapes = {
  forest: z.object({
    id: z.literal('forest'),
    geometry,
    portal: point,
    durationMs: positive,
    countdownMs: positive,
    treeCellSize: positive,
    treeRadius: positive,
  }),
  village: z
    .object({
      id: z.literal('village'),
      geometry: geometry.extend({ speed: positive }),
      wardrobe: point,
      innkeeper: point.extend({ id, name: z.string().min(1) }),
      villagers: z
        .array(
          point.extend({
            id,
            name: z.string().min(1),
            buildingId: id,
            personality: z.string().min(1),
          }),
        )
        .optional(),
      npcStops: z.array(point).min(2).optional(),
      workstations: z
        .array(
          point.extend({
            id,
            npcId: id,
            buildingId: id,
            name: z.string().min(1),
            activity: z.enum([
              'cooking',
              'brewing',
              'alchemy',
              'writing',
              'forging',
              'smelting',
              'archery',
              'leatherworking',
            ]),
            art: z.number().int().min(0).max(7),
            worker: point,
          }),
        )
        .optional(),
      buildings: z.array(
        point.extend({
          id,
          name: z.string().min(1),
          doorX: z.number().finite(),
          sourceX: nonnegative,
          sourceWidth: positive,
        }),
      ),
      torches: z.array(point),
      trainingZones: z.array(point.extend({ radius: positive, clearingRadius: positive })).min(2),
      paths: z.array(z.tuple([point, point, point, point])),
      treeSeed: nonnegative.int(),
      treeAttempts: nonnegative.int(),
      spawn: point.extend({ spacing: positive }),
      returnSpawn: point,
    })
    .superRefine((village, ctx) => {
      if (!village.workstations) return;
      const ids = new Set<string>();
      for (const [index, station] of village.workstations.entries()) {
        const resident = village.villagers?.find((npc) => npc.id === station.npcId);
        if (
          ids.has(station.id) ||
          !resident ||
          resident.buildingId !== station.buildingId ||
          !village.buildings.some((building) => building.id === station.buildingId)
        )
          ctx.addIssue({
            code: 'custom',
            path: ['workstations', index],
            message: 'Workstation needs a unique ID and its resident home building',
          });
        ids.add(station.id);
      }
      for (const npc of village.villagers ?? [])
        if (village.workstations.filter((station) => station.npcId === npc.id).length !== 2)
          ctx.addIssue({
            code: 'custom',
            path: ['workstations'],
            message: `Resident '${npc.id}' needs two workstations`,
          });
    }),
};
export const encounterShapes = {
  forest: z.object({
    id: z.literal('forest'),
    boss: id,
    spawnIntervalMs: positive,
    bossPlacementAttempts: positive.int(),
    spawnRadius: positive,
    spawnRingAttempts: positive.int(),
    spawnRingSpacing: positive,
    spawnAngleStep: positive,
    blockedSpawnRetryMs: positive,
  }),
  training: z.object({
    id: z.literal('training'),
    rewards: z.literal(false),
    refreshMs: positive,
    triangleRows: positive.int(),
    spacing: positive,
    dummyName: z.string().min(1),
    hitpoints: positive,
  }),
};
export const settingShapes: Record<string, z.ZodType> = {
  runtime: z.object({
    tickMs: positive,
    maxPlayers: positive.int(),
    chatLimit: positive.int(),
    chatMaxLength: positive.int().max(200),
    autosaveMs: positive,
    reconnectMs: positive,
    predictionLimitMs: positive,
    protocolVersion: positive.int(),
  }),
  collision: z.object({
    companionRadius: positive,
    feetOffset: z.number().finite(),
    playerProjectileRadius: positive,
    enemyProjectileRadius: positive,
  }),
  initialProgress: z.object({
    level: positive.int(),
    paragon: nonnegative.int(),
    experience: nonnegative,
    coins: nonnegative.int(),
    hitpoints: positive,
    maxHitpoints: positive,
    playtimeSeconds: nonnegative,
    talents: z.record(id, nonnegative),
  }),
  playerBodyRadius: positive,
  enemyRules: z.object({
    damageCooldownMs: positive,
    maxAlive: positive.int(),
    bruteChance: nonnegative.max(1),
    casterChance: nonnegative.max(1),
    casterStopRange: positive,
    projectileSpeed: positive,
    projectileLifetimeMs: positive,
    spawnWarningMs: positive,
    healthPerMember: positive,
    experiencePerMember: positive,
  }),
  pickupRules: z.object({
    initialHopMs: positive,
    lifetimeMs: positive,
    capacity: positive.int(),
    collectRadius: positive,
    attractionRadius: positive,
    speed: positive,
  }),
  spawnFallbacks: z.array(id).min(1),
  villageCritters: z.array(point.extend({ kind: id })),
  lobbyPortal: point,
  interactionRadius: positive,
};
export const pickupShapes = {
  experience: z.object({
    id: z.literal('experience'),
    baseAmount: positive,
    shared: z.literal(true),
  }),
  gold: z.object({
    id: z.literal('gold'),
    chance: nonnegative.max(1),
    baseAmount: positive,
    shared: z.literal(false),
    grantsCurrency: z.literal(true),
  }),
};
export const effectShapes = {
  damage: z.object({ id: z.literal('damage'), lifetimeMs: positive }),
  explosion: z.object({ id: z.literal('explosion'), lifetimeMs: positive, radius: positive }),
  blood: z.object({ id: z.literal('blood'), lifetimeMs: positive }),
  hitFlash: z.object({ id: z.literal('hit-flash'), lifetimeMs: positive }),
};
