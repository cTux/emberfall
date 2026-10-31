import { characterStats, ItemStat, itemStatWeight } from '@emberfall/core';
import type { Player, ClassId, BackpackItem } from '@emberfall/common';
import type { EquipmentBadgeView } from '@emberfall/ui';
import { ATTACK_DEFINITIONS } from '@emberfall/core/definitions/abilities/attacks';
import { PLAYER_DEFINITIONS } from '@emberfall/core/definitions/entities/players';
import { AILMENT_DEFINITIONS } from '@emberfall/core/definitions/effects/ailments';
import { number, percent, capitalize } from './metadata';

export function weaponBadges(
  player: Pick<Player, 'autoTarget'>,
  classId: ClassId,
  weapon: string,
): EquipmentBadgeView[] {
  const stats = characterStats({ classId, equipment: { weapon } });
  const { attack: abilityId, ailment } = PLAYER_DEFINITIONS[classId];
  const attack = ATTACK_DEFINITIONS[abilityId].kind;
  const range = player.autoTarget === false ? stats.manualRange : stats.range;
  const badges: EquipmentBadgeView[] = [
    {
      label: 'Power',
      icon: 'power',
      value: number(stats.power),
      explanation:
        attack === 'slash'
          ? `Deal ${number(stats.power)} damage to each enemy struck, once per swing, in a forward half-disc.`
          : `Each projectile deals ${number(stats.power)} damage to its target.${attack === 'arrow' ? ' Base arrows penetrate three targets after the first hit.' : ''}`,
    },
    {
      label: 'Range',
      icon: 'range',
      value: `${number(range)} units`,
      explanation: `Attack range: ${number(range)} units${attack === 'slash' ? '.' : player.autoTarget === false ? ' with cursor aim.' : ' with auto-target.'}`,
    },
    {
      label: 'Cooldown',
      icon: 'cooldown',
      value: `${number(stats.attackIntervalMs / 1000)} sec`,
      explanation: `Wait ${number(stats.attackIntervalMs / 1000)} seconds between attacks.`,
    },
    {
      label: 'Damage type',
      value: capitalize(stats.damageType),
      icon: ({ physical: 'physical', nature: 'nature', fire: 'burn', poison: 'poison' } as const)[
        stats.damageType
      ],
      explanation: `This weapon deals ${stats.damageType} damage.`,
    },
    {
      label: 'Critical chance',
      icon: 'criticalChance',
      value: percent(stats.criticalChance),
      explanation: `Each hit has a ${percent(stats.criticalChance)} chance to critically strike.`,
    },
    {
      label: 'Critical damage',
      icon: 'criticalDamage',
      value: percent(stats.criticalMultiplier),
      explanation: `Critical hits deal ${percent(stats.criticalMultiplier)} of normal damage.`,
    },
  ];

  if (attack === 'slash') {
    badges.push({
      label: 'Active swing',
      icon: 'duration',
      value: `${number(ATTACK_DEFINITIONS.slash.durationMs / 1000)} sec`,
      explanation: `The swing remains active for ${number(ATTACK_DEFINITIONS.slash.durationMs / 1000)} seconds. Each enemy can be hit once per swing.`,
    });
  } else {
    const definition = ATTACK_DEFINITIONS[attack];
    badges.push({
      label: 'Projectiles',
      icon: 'projectiles',
      value: number(definition.count),
      explanation: `Fire ${definition.count} projectiles per attack in a small spread.`,
    });
    badges.push({
      label: 'Projectile speed',
      icon: 'speed',
      value: `${number(definition.speed)} units/sec`,
      explanation: `Projectiles travel at ${definition.speed} units per second.`,
    });

    if (attack === 'fireball') {
      const { splashRadius, splashDamage } = ATTACK_DEFINITIONS.fireball;
      badges.push({
        label: 'Splash damage',
        icon: 'splash',
        value: number(splashDamage),
        explanation: `Fireballs explode on impact, dealing ${splashDamage} damage to other enemies within ${splashRadius} units.`,
      });
    }
  }

  if (ailment === 'roots') {
    const duration = AILMENT_DEFINITIONS.roots.durationMs / 1000;
    badges.push({
      label: 'Roots',
      icon: 'roots',
      explanation: `One projectile bounces up to three times to the nearest unhit living enemy within 250 units of each impact for full power. Roots slow ordinary enemies by 10% for ${duration} seconds with one stack; hits refresh the duration. Bosses are immune to roots.`,
    });
  } else if (ailment === 'bleed' || ailment === 'poison' || ailment === 'burn') {
    const definition = AILMENT_DEFINITIONS[ailment];
    badges.push({
      label: capitalize(ailment),
      icon: ailment,
      explanation: `Hits have a ${percent(definition.chance)} chance to apply ${capitalize(ailment)}. Each stack deals ${definition.damagePerStack} damage every ${definition.tickMs / 1000} second for ${definition.durationMs / 1000} seconds; new stacks refresh the duration.`,
    });
  }

  return badges;
}

export function rolledBadges(item?: Pick<BackpackItem, 'stats'>): EquipmentBadgeView[] {
  return Object.entries(item?.stats ?? {}).map(([stat, value]) => {
    const label =
      stat === ItemStat.DotSpeed
        ? 'DOT Speed'
        : capitalize(stat.replace(/([A-Z])/g, ' $1').toLowerCase());
    const flat =
      stat === ItemStat.Power ||
      stat === ItemStat.Armor ||
      stat === ItemStat.MaximumHealth ||
      itemStatWeight[stat as ItemStat] < 1;

    return {
      label,
      icon: 'magic',
      value: `+${number(value)}${flat ? '' : '%'}`,
      explanation:
        stat === ItemStat.DotSpeed
          ? 'Bleed, poison and burn tick faster: interval = base interval / (1 + DOT Speed / 100). Includes companion ailments; duration and damage per tick stay the same.'
          : stat === ItemStat.GoldIncrease || stat === ItemStat.ExpIncrease
            ? "Adds to the whole party's chance for additional drops. Each full 100% guarantees an extra copy."
            : `${label}: +${number(value)}${flat ? '' : '%'}. Equipped bonuses add together.`,
    };
  });
}
