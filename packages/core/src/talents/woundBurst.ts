import type { TalentCast } from './targeting.ts';
import { healingTarget } from '../tactics.ts';
import { rank } from '../talent-ailments.ts';
import { hitEnemy } from '../combat/damage.ts';
import { schedule } from './state.ts';
import { heal } from './effects.ts';

export function woundBurst(cast: TalentCast) {
  const {
    context,
    scene,
    player,
    nodeId,
    learned,
    now,
    stats,
    effectArea,
    ability,
    primary,
    ailment,
  } = cast;

  if (!primary) {
    return;
  }

  const wounds =
    primary.debuffs?.filter((entry) => {
      return entry.ownerId === player.id && entry.kind === ailment && entry.expiresAt > now;
    }) ?? [];
  const burst =
    wounds.reduce((sum, entry) => {
      return (
        sum +
        entry.stacks *
          Math.max(0, Math.floor((entry.expiresAt - now) / (entry.tickIntervalMs ?? 1000)))
      );
    }, 0) * (learned === 2 ? 2 : 1.5);
  const consumedStacks = wounds.reduce((sum, entry) => {
    return sum + entry.stacks;
  }, 0);
  primary.debuffs = primary.debuffs?.filter((entry) => {
    return !wounds.includes(entry);
  });
  hitEnemy(
    scene,
    primary,
    burst,
    player,
    now,
    undefined,
    'physical',
    false,
    ability,
    stats,
    context,
  );

  if (learned === 2) {
    for (const enemy of effectArea(scene, primary, 150)) {
      if (enemy !== primary) {
        hitEnemy(
          scene,
          enemy,
          burst * 0.5,
          player,
          now,
          undefined,
          'physical',
          false,
          ability,
          stats,
          context,
        );
      }
    }
  }

  const offering = rank(player, 1, 8);
  let orbConsumed = false;

  if (offering && consumedStacks >= 3) {
    schedule(scene, player, nodeId, now, 6000, 500, (_at, players) => {
      if (orbConsumed) {
        return;
      }

      const ally = healingTarget(
        players,
        player,
        primary,
        60 * (1 + stats.bonuses.areaOfEffect / 100),
      );

      if (ally) {
        heal(ally, offering === 2 ? 0.05 : 0.03);
        orbConsumed = true;
      }
    });
  }
}
