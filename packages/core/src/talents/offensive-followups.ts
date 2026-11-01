import { TALENT_MAX_RANK, TALENT_THIRD_TIER, TALENT_FINISHER_TIER } from '../talent-catalog.ts';
import type { TalentCast } from './targeting.ts';
import { rank } from '../talent-ailments.ts';
import { TALENT_NAMES } from '../talent-tree.ts';
import { state } from './state.ts';
import { strike } from './effects.ts';
import { OFFENSE } from './offensive-tuning.ts';

export function offensiveFollowups(cast: TalentCast) {
  const {
    scene,
    player,
    slot,
    aim,
    now,
    effectArea,
    column,
    tier,
    classId,
    context,
    primary,
    targets,
  } = cast;
  const value = state(player, scene);

  if (column === 0 && tier === TALENT_THIRD_TIER && rank(player, 0, 6)) {
    value.fissure = { ...aim, until: now + OFFENSE.fissureLifetimeMs };
  } else if (tier === 0 && value.fissure && value.fissure.until > now) {
    for (const enemy of effectArea(scene, value.fissure, OFFENSE.fissureRadius)) {
      strike(
        scene,
        player,
        enemy,
        OFFENSE.fissurePower[rank(player, 0, 6) === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][6],
        context,
      );
    }

    value.fissure = undefined;
  }

  const momentum = rank(player, 0, 8);

  if (
    column === 0 &&
    tier === TALENT_FINISHER_TIER &&
    primary &&
    primary.hitpoints <= 0 &&
    momentum
  ) {
    const id = `talent:${classId}:${slot}`;
    player.talentCooldowns![id] = Math.max(
      now,
      player.talentCooldowns![id] - OFFENSE.momentumRefundMs[momentum === TALENT_MAX_RANK ? 1 : 0],
    );
    value.empoweredUntil = now + OFFENSE.momentumLifetimeMs;
  }

  if (tier === 0 && value.empoweredUntil && value.empoweredUntil > now) {
    value.empoweredUntil = undefined;

    for (const enemy of targets) {
      strike(
        scene,
        player,
        enemy,
        OFFENSE.momentumPower[momentum === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][8],
        context,
      );
    }
  }

  value.sequence = value.sequence.filter((entry) => {
    return now - entry.at <= OFFENSE.rhythmWindowMs && entry.slot !== slot;
  });
  value.sequence.push({ slot, at: now });
  const rhythm = rank(player, 0, 9);

  if (rhythm && value.sequence.length >= OFFENSE.rhythmDistinctAbilities && now >= value.rhythmAt) {
    value.rhythmAt = now + OFFENSE.rhythmCooldownMs;
    value.sequence = [];

    for (const enemy of effectArea(scene, player, OFFENSE.rhythmRadius)) {
      strike(
        scene,
        player,
        enemy,
        OFFENSE.rhythmPower[rhythm === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][9],
        context,
      );
    }
  }
}
