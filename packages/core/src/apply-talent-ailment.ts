import { TALENT_AILMENTS } from './talent-ailment-tuning.ts';
import type { Enemy, Player, DebuffKind } from '@emberfall/core/contracts';
import type { CharacterStats } from './content/rules.ts';
import { dotTickIntervalMs } from './equipment.ts';

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
