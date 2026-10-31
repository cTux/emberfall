import type { ValidationContext } from './context.ts';

export function validateEnemies(context: ValidationContext) {
  const { r, check, positive, nonnegative, reference } = context;
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
    ] as const) {
      check(positive(enemy[key]), 'enemies', enemy.id, `invalid ${key}`);
    }

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
  for (const enemy of fallbacks) {
    reference('settings', 'spawnFallbacks', 'enemies', enemy);
  }

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
    ] as const) {
      check(positive(companion[key]), 'companions', companion.id, `invalid ${key}`);
    }
  }

  for (const ailment of r.ailments.values()) {
    check(
      ['bleed', 'poison', 'burn', 'roots', 'silence'].includes(ailment.kind) &&
        ailment.id === ailment.kind,
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
}
