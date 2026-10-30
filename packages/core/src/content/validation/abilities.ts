import type { ValidationContext } from './context.ts';

export function validateAbilities(context: ValidationContext) {
  const { r, check, positive, nonnegative, reference } = context;
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
}
