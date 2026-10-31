import type { DebuffKind, Enemy, Player, SceneState } from '@emberfall/common';
import { forestDistance } from './scene.ts';
import { characterStats, dotTickIntervalMs } from './equipment.ts';
import type { CharacterStats } from './content/rules.ts';
import { talentNodeId, talentRank } from './talent-tree.ts';

export function rank(player: Player, column: number, row: number) {
  return talentRank(player, talentNodeId(player.classId ?? 'warrior', column, row));
}

export function applyTalentAilment(
  enemy: Enemy,
  player: Player,
  kind: DebuffKind,
  stacks: number,
  now: number,
  duration = 5000,
  stats?: CharacterStats,
) {
  if (enemy.hitpoints <= 0 || (kind === 'roots' && enemy.kind === 'boss')) return;
  enemy.debuffs ??= [];
  let entry = enemy.debuffs.find(
    (value) => value.kind === kind && value.ownerId === player.id && value.expiresAt > now,
  );
  if (!entry) {
    const tickIntervalMs =
      kind === 'bleed' || kind === 'poison' || kind === 'burn'
        ? dotTickIntervalMs(player, 1000, stats)
        : 1000;
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

  entry.stacks = kind === 'roots' ? 1 : Math.min(5, entry.stacks + stacks);
  entry.expiresAt = now + duration;
}

export function talentArea(
  scene: SceneState,
  point: { x: number; y: number },
  radius: number,
  player?: Player,
) {
  radius *= 1 + (player ? characterStats(player).bonuses.areaOfEffect / 100 : 0);

  return scene.enemies.filter(
    (enemy) => enemy.hitpoints > 0 && forestDistance(point, enemy) <= radius,
  );
}

/** Extra bleed chance is additive with the weapon's existing roll. */
export function talentAilmentChance(player: Player, kind: DebuffKind) {
  if (kind !== 'bleed' || (player.classId ?? 'warrior') !== 'warrior') return 0;
  const learned = rank(player, 1, 0);

  return learned === 2 ? 0.35 : learned === 1 ? 0.2 : 0;
}

export function talentEnemyDeath(
  scene: SceneState,
  player: Player,
  enemy: Enemy,
  now: number,
  stats?: CharacterStats,
) {
  if (player.classId === 'druid') return;
  const spread = rank(player, 1, 6);
  const wounds = enemy.debuffs?.some(
    (entry) =>
      entry.ownerId === player.id &&
      entry.expiresAt > now &&
      ['bleed', 'poison', 'burn'].includes(entry.kind),
  );
  if (spread && wounds) {
    const kind =
      player.classId === 'warrior' || player.classId === 'druid'
        ? 'bleed'
        : player.classId === 'ranger'
          ? 'poison'
          : 'burn';
    for (const other of talentArea(scene, enemy, 180, player).slice(0, spread === 2 ? 4 : 2))
      applyTalentAilment(other, player, kind, spread, now, undefined, stats);
  }
}
