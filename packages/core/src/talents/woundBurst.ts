import { TALENT_MAX_RANK } from '../talent-catalog.ts';
import { PERCENT } from '@emberfall/common';
import type { TalentCast } from './targeting.ts';
import { healingTarget } from '../tactics.ts';
import { rank } from '../talent-ailments.ts';
import { hitEnemy } from '../combat/damage.ts';
import { schedule } from './state.ts';
import { heal } from './effects.ts';

// Existing rank-one/rank-two wound-burst balance; original calibration is undocumented.
// Preserve the described burst, splash and healing opportunity rather than retuning combat.
const WOUND_BURST = {
  fallbackTickMs: 1000,
  power: [1.5, 2],
  splashRadius: 150,
  splashFraction: 0.5,
  offeringStacks: 3,
  offeringDurationMs: 6000,
  offeringIntervalMs: 500,
  offeringRadius: 60,
  offeringHeal: [0.03, 0.05],
} as const;

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
          Math.max(
            0,
            Math.floor(
              (entry.expiresAt - now) / (entry.tickIntervalMs ?? WOUND_BURST.fallbackTickMs),
            ),
          )
      );
    }, 0) * WOUND_BURST.power[learned === TALENT_MAX_RANK ? 1 : 0];
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

  if (learned === TALENT_MAX_RANK) {
    for (const enemy of effectArea(scene, primary, WOUND_BURST.splashRadius)) {
      if (enemy !== primary) {
        hitEnemy(
          scene,
          enemy,
          burst * WOUND_BURST.splashFraction,
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

  if (offering && consumedStacks >= WOUND_BURST.offeringStacks) {
    schedule(
      scene,
      player,
      nodeId,
      now,
      WOUND_BURST.offeringDurationMs,
      WOUND_BURST.offeringIntervalMs,
      (at, players) => {
        if (orbConsumed) {
          return;
        }

        const ally = healingTarget(
          players,
          player,
          primary,
          WOUND_BURST.offeringRadius * (1 + stats.bonuses.areaOfEffect / PERCENT),
        );

        if (ally) {
          heal(ally, WOUND_BURST.offeringHeal[offering === TALENT_MAX_RANK ? 1 : 0], player, at);
          orbConsumed = true;
        }
      },
    );
  }
}
