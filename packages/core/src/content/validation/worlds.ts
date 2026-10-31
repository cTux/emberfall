import type { ValidationContext } from './context.ts';

export function validateWorlds(context: ValidationContext) {
  const { r, check, positive, reference } = context;
  for (const id of ['warrior', 'ranger', 'mage', 'druid']) {
    r.classes.require(id);
  }

  for (const id of [
    'power',
    'attacksPerSecond',
    'range',
    'manualRange',
    'criticalChance',
    'criticalMultiplier',
    'maxHitpoints',
    'armor',
  ]) {
    r.stats.require(id);
  }

  // Scene families remain fixed while their registered data drives world initialization.
  for (const world of r.worlds.values()) {
    check(
      ['village', 'forest'].includes(world.id),
      'worlds',
      world.id,
      'unsupported playable scene family',
    );
  }

  for (const encounter of r.encounters.values()) {
    check(
      ['forest', 'training'].includes(encounter.id),
      'encounters',
      encounter.id,
      'unsupported encounter family',
    );
  }

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
  for (const critter of critters) {
    reference('settings', 'villageCritters', 'critters', critter.kind);
  }

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
  ]) {
    r.settings.require(id);
  }

  const runtime = r.settings.require('runtime').value as Record<string, number>;
  for (const [key, value] of Object.entries(runtime)) {
    check(positive(value), 'settings', 'runtime', `invalid ${key}`);
  }
}
