import { type Enemy, type Tactics, DEFAULT_TACTICS } from '@emberfall/common';
import { forestDistance } from './scene.ts';

// Lower scores prioritize bosses, then elites, then ordinary enemies as the tactics setting promises.

// Lower scores prioritize bosses, then elites, then ordinary enemies as the tactics setting promises.
const ENEMY_PRIORITY = { boss: 0, elite: 1, normal: 2 } as const;

/** Eligibility precedes ordered preferences; equal scores retain collection order. */
export function attackTarget(
  origin: { x: number; y: number },
  enemies: Enemy[],
  range: number,
  tactics: Tactics = DEFAULT_TACTICS,
  lockedId?: number,
) {
  let best: Enemy | undefined;
  const score = (enemy: Enemy, rule: Tactics['offensive'][number]) => {
    return rule === 'nearest'
      ? forestDistance(origin, enemy)
      : rule === 'lowestHealth'
        ? enemy.hitpoints / (enemy.maxHitpoints ?? enemy.hitpoints)
        : enemy.kind === 'boss'
          ? ENEMY_PRIORITY.boss
          : enemy.kind === 'elite'
            ? ENEMY_PRIORITY.elite
            : ENEMY_PRIORITY.normal;
  };

  for (const enemy of enemies) {
    if (enemy.hitpoints <= 0 || forestDistance(origin, enemy) > range) {
      continue;
    }

    if (tactics.keepTarget && enemy.id === lockedId) {
      return enemy;
    }

    if (!best) {
      best = enemy;
    } else {
      for (const rule of tactics.offensive) {
        const difference = score(enemy, rule) - score(best, rule);

        if (difference < 0) {
          best = enemy;
        }

        if (difference !== 0) {
          break;
        }
      }
    }
  }

  return best;
}
