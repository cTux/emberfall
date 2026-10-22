import type { Registries, RegistryName } from './contracts.ts';
import {
  contentShapes,
  worldShapes,
  encounterShapes,
  settingShapes,
  pickupShapes,
  effectShapes,
} from './shapes.ts';
export function validateContent(
  r: Registries,
  owner: (name: RegistryName, id: string) => string | undefined,
) {
  const fail = (name: RegistryName, id: string, message: string): never => {
    throw new Error(`Mod '${owner(name, id)}' ${name} '${id}': ${message}`);
  };
  const check = (ok: unknown, name: RegistryName, id: string, message: string) => {
    if (!ok) fail(name, id, message);
  };
  for (const name of Object.keys(r) as RegistryName[])
    for (const entry of r[name].values()) {
      const result = contentShapes[name].safeParse(entry);
      if (!result.success) fail(name, entry.id, result.error.message);
    }
  for (const entry of r.worlds.values()) {
    const shape = worldShapes[entry.id as keyof typeof worldShapes];
    if (!shape) fail('worlds', entry.id, 'unsupported playable scene family');
    const result = shape.safeParse(entry.value);
    if (!result.success) fail('worlds', entry.id, result.error.message);
  }
  for (const entry of r.encounters.values()) {
    const shape = encounterShapes[entry.id as keyof typeof encounterShapes];
    if (!shape) fail('encounters', entry.id, 'unsupported encounter family');
    const result = shape.safeParse(entry.value);
    if (!result.success) fail('encounters', entry.id, result.error.message);
  }
  for (const entry of r.settings.values()) {
    const shape = settingShapes[entry.id];
    if (!shape) fail('settings', entry.id, 'unsupported setting');
    const result = shape.safeParse(entry.value);
    if (!result.success) fail('settings', entry.id, result.error.message);
  }
  for (const entry of r.pickups.values()) {
    const shape = pickupShapes[entry.id as keyof typeof pickupShapes];
    if (!shape) fail('pickups', entry.id, 'unsupported pickup mechanic');
    const result = shape.safeParse(entry.value);
    if (!result.success) fail('pickups', entry.id, result.error.message);
  }
  for (const entry of r.effects.values()) {
    const shape = effectShapes[entry.id as keyof typeof effectShapes];
    if (!shape) fail('effects', entry.id, 'unsupported effect mechanic');
    const result = shape.safeParse(entry.value);
    if (!result.success) fail('effects', entry.id, result.error.message);
  }
  for (const entry of r.critters.values())
    check(
      ['cat', 'chicken', 'raccoon'].includes(entry.id),
      'critters',
      entry.id,
      'unsupported critter art family',
    );
  for (const id of ['experience', 'gold']) r.pickups.require(id);
  for (const id of ['damage', 'explosion', 'blood', 'hitFlash']) r.effects.require(id);
  const positive = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;
  const nonnegative = (value: unknown) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0;
  const reference = (name: RegistryName, id: string, target: RegistryName, value: string) =>
    check(r[target].has(value), name, id, `unknown ${target} reference '${value}'`);
  for (const stat of r.stats.values())
    check(
      typeof stat.label === 'string' &&
        Number.isFinite(stat.default) &&
        stat.aggregation === 'sum' &&
        ['number', 'percent'].includes(stat.format),
      'stats',
      stat.id,
      'invalid default, aggregation or format',
    );
  for (const slot of r.slots.values()) {
    check(
      typeof slot.label === 'string' &&
        positive(slot.column) &&
        positive(slot.row) &&
        Number.isInteger(slot.column) &&
        Number.isInteger(slot.row) &&
        slot.gearTypes.length > 0,
      'slots',
      slot.id,
      'invalid label, layout or gearTypes',
    );
    for (const type of slot.gearTypes) reference('slots', slot.id, 'gearTypes', type);
  }
  for (const item of r.items.values()) {
    check(
      typeof item.name === 'string' && (item.price === undefined || nonnegative(item.price)),
      'items',
      item.id,
      'invalid name or price',
    );
    check(item.kind === 'gear' || item.kind === 'consumable', 'items', item.id, 'unsupported kind');
    if (item.kind === 'gear') reference('items', item.id, 'gearTypes', item.gearType);
    else check(positive(item.healing), 'items', item.id, 'invalid healing');
    if (item.kind === 'gear' && item.damageType !== undefined)
      check(
        ['physical', 'fire', 'poison', 'nature'].includes(item.damageType),
        'items',
        item.id,
        'unsupported damageType',
      );
    for (const [key, value] of Object.entries(item.kind === 'gear' ? item.stats : {})) {
      reference('items', item.id, 'stats', key);
      check(Number.isFinite(value), 'items', item.id, `invalid stat '${key}'`);
    }
  }
  const talentSlots = new Set<string>();
  for (const ability of r.abilities.values()) {
    if (ability.classId !== undefined || ability.talentSlot !== undefined) {
      check(
        ability.classId !== undefined && ability.talentSlot !== undefined,
        'abilities',
        ability.id,
        'talent class and slot must be specified together',
      );
      reference('abilities', ability.id, 'classes', ability.classId!);
      const key = `${ability.classId}:${ability.talentSlot}`;
      check(!talentSlots.has(key), 'abilities', ability.id, 'duplicate talent class/slot');
      talentSlots.add(key);
    }
    check(
      ['slash', 'arrow', 'fireball', 'roots'].includes(ability.kind),
      'abilities',
      ability.id,
      'unsupported mechanic kind',
    );
    for (const key of [
      'range',
      'manualRange',
      'intervalMs',
      'durationMs',
      'aimSmoothingSeconds',
    ] as const)
      check(positive(ability[key]), 'abilities', ability.id, `invalid ${key}`);
    check(
      ability.piercing === (ability.kind === 'arrow'),
      'abilities',
      ability.id,
      'piercing must match supported mechanic family',
    );
    check(nonnegative(ability.damage), 'abilities', ability.id, 'invalid damage');
    if (ability.kind !== 'slash') {
      check(
        positive(ability.speed) &&
          positive(ability.count) &&
          Number.isInteger(ability.count) &&
          nonnegative(ability.spreadRadians),
        'abilities',
        ability.id,
        'invalid projectile speed, count or spread',
      );
      if (ability.kind === 'fireball')
        check(
          positive(ability.splashRadius) && nonnegative(ability.splashDamage),
          'abilities',
          ability.id,
          'invalid splash',
        );
      if (ability.kind === 'roots')
        check(
          nonnegative(ability.bounces) &&
            Number.isInteger(ability.bounces) &&
            positive(ability.bounceRadius),
          'abilities',
          ability.id,
          'invalid bounce',
        );
    }
  }
  for (const player of r.classes.values()) {
    reference('classes', player.id, 'abilities', player.attack);
    reference('classes', player.id, 'ailments', player.ailment);
    reference('classes', player.id, 'items', player.starterWeapon);
    check(
      (r.abilities.require(player.attack).kind === 'roots') === (player.ailment === 'roots'),
      'classes',
      player.id,
      'roots ailment requires the roots mechanic',
    );
    if (player.companion) reference('classes', player.id, 'companions', player.companion);
    check(
      ['warrior', 'ranger', 'mage', 'druid'].includes(player.art),
      'classes',
      player.id,
      'unsupported art family',
    );
    check(
      typeof player.label === 'string' && typeof player.sprite === 'string',
      'classes',
      player.id,
      'invalid label or sprite',
    );
    for (const type of player.gearTypes) reference('classes', player.id, 'gearTypes', type);
    const starter = r.items.require(player.starterWeapon),
      slot = r.slots.require('weapon');
    check(
      starter.kind === 'gear' &&
        slot.gearTypes.includes(starter.gearType) &&
        player.gearTypes.includes(starter.gearType) &&
        !!starter.damageType &&
        positive(starter.stats.attacksPerSecond),
      'classes',
      player.id,
      'incompatible starterWeapon',
    );
  }
  for (const enemy of r.enemies.values()) {
    check(
      ['melee', 'ranged'].includes(enemy.behavior) &&
        ['skeleton', 'runner', 'brute', 'caster'].includes(enemy.art),
      'enemies',
      enemy.id,
      'unsupported behavior or art',
    );
    for (const key of [
      'speed',
      'radius',
      'size',
      'reach',
      'windup',
      'cooldown',
      'hitPoints',
    ] as const)
      check(positive(enemy[key]), 'enemies', enemy.id, `invalid ${key}`);
    check(nonnegative(enemy.damage), 'enemies', enemy.id, 'invalid damage');
  }
  let spawnChance = 0;
  for (const spawn of r.spawnRules.values()) {
    reference('spawnRules', spawn.id, 'enemies', spawn.enemy);
    spawnChance += spawn.chance;
  }
  check(
    spawnChance <= 1,
    'spawnRules',
    r.spawnRules.values()[0]?.id ?? '',
    'combined spawn chances exceed 1',
  );
  const fallbacks = r.settings.require('spawnFallbacks').value as string[];
  for (const enemy of fallbacks) reference('settings', 'spawnFallbacks', 'enemies', enemy);
  for (const boss of r.bosses.values()) {
    reference('bosses', boss.id, 'enemies', boss.archetype);
    check(boss.kind === 'boss', 'bosses', boss.id, 'unsupported kind');
  }
  for (const companion of r.companions.values()) {
    reference('companions', companion.id, 'abilities', companion.attack);
    check(
      companion.id === 'bear' && r.abilities.require(companion.attack).kind === 'slash',
      'companions',
      companion.id,
      'only the bear companion/melee family is supported',
    );
    for (const key of [
      'healthMultiplier',
      'range',
      'huntRadius',
      'returnRadius',
      'teleportRadius',
      'decisionMs',
      'resurrectionMs',
    ] as const)
      check(positive(companion[key]), 'companions', companion.id, `invalid ${key}`);
  }
  for (const ailment of r.ailments.values()) {
    check(
      ['bleed', 'poison', 'burn', 'roots'].includes(ailment.kind) && ailment.id === ailment.kind,
      'ailments',
      ailment.id,
      'unsupported ailment identity/mechanic',
    );
    check(
      positive(ailment.durationMs) &&
        positive(ailment.tickMs) &&
        nonnegative(ailment.damagePerStack) &&
        nonnegative(ailment.chance) &&
        ailment.chance <= 1,
      'ailments',
      ailment.id,
      'invalid timing, damage or chance',
    );
  }
  for (const type of r.enemyTypes.values())
    check(
      ['normal', 'elite', 'boss'].includes(type.id) &&
        positive(type.multiplier) &&
        nonnegative(type.dropChance) &&
        type.dropChance <= 100 &&
        (typeof type.dropCount === 'number'
          ? nonnegative(type.dropCount)
          : nonnegative(type.dropCount.min) &&
            nonnegative(type.dropCount.max) &&
            type.dropCount.min <= type.dropCount.max),
      'enemyTypes',
      type.id,
      'unsupported type or invalid balance',
    );
  for (const difficulty of r.difficulties.values())
    check(
      ['Easy', 'Medium', 'Hard'].includes(difficulty.id) && positive(difficulty.multiplier),
      'difficulties',
      difficulty.id,
      'unsupported difficulty or invalid multiplier',
    );
  for (const id of ['warrior', 'ranger', 'mage', 'druid']) r.classes.require(id);
  for (const id of [
    'power',
    'attacksPerSecond',
    'range',
    'manualRange',
    'criticalChance',
    'criticalMultiplier',
    'maxHitpoints',
    'armor',
  ])
    r.stats.require(id);
  // Scene families remain fixed while their registered data drives world initialization.
  for (const world of r.worlds.values())
    check(
      ['village', 'forest'].includes(world.id),
      'worlds',
      world.id,
      'unsupported playable scene family',
    );
  for (const encounter of r.encounters.values())
    check(
      ['forest', 'training'].includes(encounter.id),
      'encounters',
      encounter.id,
      'unsupported encounter family',
    );
  const village = r.worlds.require('village').value as {
    geometry: { width: number; height: number; speed: number };
  };
  const forest = r.worlds.require('forest').value as {
    geometry: { width: number; height: number };
    treeCellSize: number;
    durationMs: number;
    countdownMs: number;
  };
  check(
    positive(village.geometry.width) &&
      positive(village.geometry.height) &&
      positive(village.geometry.speed) &&
      village.geometry.width === forest.geometry.width &&
      village.geometry.height === forest.geometry.height &&
      positive(forest.treeCellSize) &&
      positive(forest.durationMs) &&
      positive(forest.countdownMs),
    'worlds',
    'forest',
    'invalid shared wrapping geometry or timing',
  );
  const encounter = r.encounters.require('forest').value as {
    boss: string;
    spawnIntervalMs: number;
  };
  reference('encounters', 'forest', 'bosses', encounter.boss);
  check(positive(encounter.spawnIntervalMs), 'encounters', 'forest', 'invalid spawnIntervalMs');
  const critters = r.settings.require('villageCritters').value as { kind: string }[];
  for (const critter of critters)
    reference('settings', 'villageCritters', 'critters', critter.kind);
  for (const id of [
    'runtime',
    'collision',
    'initialProgress',
    'playerBodyRadius',
    'enemyRules',
    'pickupRules',
    'villageCritters',
    'lobbyPortal',
    'interactionRadius',
  ])
    r.settings.require(id);
  const runtime = r.settings.require('runtime').value as Record<string, number>;
  for (const [key, value] of Object.entries(runtime))
    check(positive(value), 'settings', 'runtime', `invalid ${key}`);
}
