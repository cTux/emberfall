import { TALENT_MAX_RANK } from './talent-catalog.ts';
import { PERCENT } from '@emberfall/common';
import type { DebuffKind, Enemy, Player, SceneState } from '@emberfall/common';
import { forestDistance } from './scene.ts';
import { characterStats, dotTickIntervalMs } from './equipment.ts';
import type { CharacterStats } from './content/rules.ts';
import { talentNodeId, talentRank } from './talent-tree.ts';

// Preserve the existing talent-ailment balance and tooltip contract; the original
// calibration of these chances, caps, radii and durations is undocumented.
const TALENT_AILMENTS = {
  durationMs: 5000,
  tickMs: 1000,
  maxStacks: 5,
  bleedChance: [0.2, 0.35],
  spreadRadius: 180,
  spreadTargets: [2, 4],
} as const;

export function rank(player: Player, column: number, row: number) {
  return talentRank(player, talentNodeId(player.classId ?? 'warrior', column, row));
}

export function applyTalentAilment(
  enemy: Enemy,
  player: Player,
  kind: DebuffKind,
  stacks: number,
  now: number,
  duration: number = TALENT_AILMENTS.durationMs,
  stats?: CharacterStats,
) {
  if (enemy.hitpoints <= 0 || (kind === 'roots' && enemy.kind === 'boss')) {
    return;
  }

  enemy.debuffs ??= [];
  let entry = enemy.debuffs.find((value) => {
    return value.kind === kind && value.ownerId === player.id && value.expiresAt > now;
  });

  if (!entry) {
    const tickIntervalMs =
      kind === 'bleed' || kind === 'poison' || kind === 'burn'
        ? dotTickIntervalMs(player, TALENT_AILMENTS.tickMs, stats)
        : TALENT_AILMENTS.tickMs;
    entry = {
      kind,
      stacks: 0,
      ownerId: player.id,
      nextTick: now + tickIntervalMs,
      tickIntervalMs,
      expiresAt: now + duration,
    };
    enemy.debuffs.push(entry);
  }

  entry.stacks = kind === 'roots' ? 1 : Math.min(TALENT_AILMENTS.maxStacks, entry.stacks + stacks);
  entry.expiresAt = now + duration;
}

export function talentArea(
  scene: SceneState,
  point: { x: number; y: number },
  radius: number,
  player?: Player,
) {
  radius *= 1 + (player ? characterStats(player).bonuses.areaOfEffect / PERCENT : 0);

  return scene.enemies.filter((enemy) => {
    return enemy.hitpoints > 0 && forestDistance(point, enemy) <= radius;
  });
}

/** Extra bleed chance is additive with the weapon's existing roll. */
export function talentAilmentChance(player: Player, kind: DebuffKind) {
  if (kind !== 'bleed' || (player.classId ?? 'warrior') !== 'warrior') {
    return 0;
  }

  const learned = rank(player, 1, 0);

  return learned === TALENT_MAX_RANK
    ? TALENT_AILMENTS.bleedChance[1]
    : learned === 1
      ? TALENT_AILMENTS.bleedChance[0]
      : 0;
}

export function talentEnemyDeath(
  scene: SceneState,
  player: Player,
  enemy: Enemy,
  now: number,
  stats?: CharacterStats,
) {
  if (player.classId === 'druid') {
    return;
  }

  const spread = rank(player, 1, 6);
  const wounds = enemy.debuffs?.some((entry) => {
    return (
      entry.ownerId === player.id &&
      entry.expiresAt > now &&
      ['bleed', 'poison', 'burn'].includes(entry.kind)
    );
  });

  if (spread && wounds) {
    const kind =
      player.classId === 'warrior' || player.classId === 'druid'
        ? 'bleed'
        : player.classId === 'ranger'
          ? 'poison'
          : 'burn';

    for (const other of talentArea(scene, enemy, TALENT_AILMENTS.spreadRadius, player).slice(
      0,
      TALENT_AILMENTS.spreadTargets[spread === TALENT_MAX_RANK ? 1 : 0],
    )) {
      applyTalentAilment(other, player, kind, spread, now, undefined, stats);
    }
  }
}
