import { TALENT_MAX_RANK, TALENT_THIRD_TIER } from '../talent-catalog.ts';
import type { TalentCast } from './targeting.ts';
import { rank, applyTalentAilment } from '../talent-ailments.ts';
import { schedule } from './state.ts';
import { strike } from './effects.ts';

// Existing rank-one/rank-two Bear balance; the original tuning basis is undocumented.
// Retain these values so the companion's healing, control and damage still match its tooltips.
const BEAR = {
  pouncePower: [1.5, 2.1],
  howlHeal: [0.2, 0.3],
  howlRadius: 200,
  howlRootsMs: 1500,
  maulRadius: 250,
  maulPower: [1.8, 2.5],
  rampageDurationMs: 4000,
  rampageIntervalMs: 1000,
  rampageRadius: 180,
  rampagePower: [0.6, 1],
} as const;

export function companion(cast: TalentCast) {
  const {
    context,
    scene,
    player,
    nodeId,
    learned,
    now,
    stats,
    effectArea,
    tier,
    ability,
    primary,
  } = cast;

  const learnedIndex = learned === TALENT_MAX_RANK ? 1 : 0;
  const bear = player.bear;

  if (!bear || bear.hitpoints <= 0) {
    return;
  }

  if (tier === 0 && primary) {
    bear.x = primary.x;
    bear.y = primary.y;
    strike(scene, player, primary, BEAR.pouncePower[learnedIndex], now, ability, context);
  } else if (tier === 1) {
    bear.hitpoints = Math.min(
      bear.maxHitpoints,
      bear.hitpoints + bear.maxHitpoints * BEAR.howlHeal[learnedIndex],
    );

    for (const enemy of effectArea(scene, bear, BEAR.howlRadius)) {
      applyTalentAilment(enemy, player, 'roots', 1, now, BEAR.howlRootsMs);
    }
  } else if (tier === TALENT_THIRD_TIER) {
    for (const enemy of effectArea(scene, bear, BEAR.maulRadius)) {
      strike(scene, player, enemy, BEAR.maulPower[learnedIndex], now, ability, context);
      applyTalentAilment(enemy, player, 'bleed', learned, now, undefined, stats);
    }
  } else {
    schedule(scene, player, nodeId, now, BEAR.rampageDurationMs, BEAR.rampageIntervalMs, (at) => {
      if (bear.hitpoints <= 0) {
        return;
      }

      for (const enemy of effectArea(scene, bear, BEAR.rampageRadius)) {
        strike(scene, player, enemy, BEAR.rampagePower[learnedIndex], at, ability, context);
      }
    });
  }

  const hunting = rank(player, 1, 4);

  if (hunting && tier === 1) {
    for (const enemy of effectArea(scene, bear, BEAR.howlRadius)) {
      applyTalentAilment(enemy, player, 'bleed', hunting, now, undefined, stats);
    }
  }
}
