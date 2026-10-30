import type { TalentCast } from './targeting.ts';
import { rank, applyTalentAilment } from '../talent-ailments.ts';
import { schedule } from './state.ts';
import { strike } from './effects.ts';

export function companion(cast: TalentCast) {
  const { scene, player, nodeId, learned, now, stats, effectArea, tier, ability, primary } = cast;

  const bear = player.bear;
  if (!bear || bear.hitpoints <= 0) return;
  if (tier === 0 && primary) {
    bear.x = primary.x;
    bear.y = primary.y;
    strike(scene, player, primary, learned === 2 ? 2.1 : 1.5, now, ability);
  } else if (tier === 1) {
    bear.hitpoints = Math.min(
      bear.maxHitpoints,
      bear.hitpoints + bear.maxHitpoints * (learned === 2 ? 0.3 : 0.2),
    );
    for (const enemy of effectArea(scene, bear, 200))
      applyTalentAilment(enemy, player, 'roots', 1, now, 1500);
  } else if (tier === 2)
    for (const enemy of effectArea(scene, bear, 250)) {
      strike(scene, player, enemy, learned === 2 ? 2.5 : 1.8, now, ability);
      applyTalentAilment(enemy, player, 'bleed', learned, now, undefined, stats);
    }
  else
    schedule(scene, player, nodeId, now, 4000, 1000, (at) => {
      if (bear.hitpoints <= 0) return;
      for (const enemy of effectArea(scene, bear, 180))
        strike(scene, player, enemy, learned === 2 ? 1 : 0.6, at, ability);
    });
  const hunting = rank(player, 1, 4);
  if (hunting && tier === 1)
    for (const enemy of effectArea(scene, bear, 200))
      applyTalentAilment(enemy, player, 'bleed', hunting, now, undefined, stats);
}
