import { TALENT_MAX_RANK } from '../talent-catalog.ts';
import { PERCENT } from '@emberfall/common';
import { DEFENSE } from './defensive-tuning.ts';
import type { TalentCast } from './targeting.ts';
import { forestDistance } from '../scene.ts';
import { healingTarget } from '../tactics.ts';
import { rank, applyTalentAilment } from '../talent-ailments.ts';
import { TALENT_NAMES } from '../talent-tree.ts';
import { state, schedule } from './state.ts';
import { control, strike, heal, shield } from './effects.ts';

function guard(cast: TalentCast) {
  const {
    context,
    scene,
    player,
    learned,
    aim,
    now,
    effectArea,
    classId,
    ability,
    origin,
    recipient,
  } = cast;

  const learnedIndex = learned === TALENT_MAX_RANK ? 1 : 0;

  if (classId === 'druid') {
    if (recipient) {
      heal(recipient, DEFENSE.guardHeal[learnedIndex]);
    }
  } else {
    for (const enemy of effectArea(scene, origin, DEFENSE.guardRadius)) {
      strike(scene, player, enemy, DEFENSE.guardPower[learnedIndex], now, ability, context);
      applyTalentAilment(enemy, player, 'roots', 1, now, DEFENSE.guardControlMs[learnedIndex]);
      enemy.attack = undefined;
      control(enemy, now, DEFENSE.guardControlMs[learnedIndex]);
    }
  }

  const fragments = rank(player, 2, 2);

  if (fragments) {
    for (const enemy of effectArea(scene, aim, DEFENSE.fragmentsRadius).slice(
      0,
      DEFENSE.fragmentsTargets[fragments === TALENT_MAX_RANK ? 1 : 0],
    )) {
      strike(
        scene,
        player,
        enemy,
        DEFENSE.fragmentsPower[fragments === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][2][2],
        context,
      );
    }
  }
}

function shelter(cast: TalentCast) {
  const { scene, player, nodeId, learned, now, stats, effectArea, classId, origin } = cast;

  const learnedIndex = learned === TALENT_MAX_RANK ? 1 : 0;

  schedule(
    scene,
    player,
    nodeId,
    now,
    DEFENSE.shelterDurationMs,
    DEFENSE.shelterIntervalMs,
    (at, players) => {
      if (classId === 'druid') {
        const ally = healingTarget(
          players,
          player,
          origin,
          DEFENSE.shelterRadius * (1 + stats.bonuses.areaOfEffect / PERCENT),
        );

        if (ally) {
          heal(ally, DEFENSE.shelterHeal[learnedIndex]);
        }
      } else {
        for (const ally of players.filter((ally) => {
          return (
            ally.hitpoints > 0 &&
            forestDistance(ally, origin) <=
              DEFENSE.shelterRadius * (1 + stats.bonuses.areaOfEffect / PERCENT)
          );
        })) {
          shield(
            ally,
            scene,
            player.maxHitpoints * DEFENSE.shelterBarrier[learnedIndex],
            at + DEFENSE.shelterBarrierMs,
          );
        }
      }

      const hold = rank(player, 2, 4);

      if (hold) {
        for (const enemy of effectArea(scene, origin, DEFENSE.shelterRadius)) {
          applyTalentAilment(
            enemy,
            player,
            'roots',
            1,
            at,
            DEFENSE.holdControlMs[hold === TALENT_MAX_RANK ? 1 : 0],
          );
          control(enemy, at, DEFENSE.holdControlMs[hold === TALENT_MAX_RANK ? 1 : 0]);
        }
      }
    },
  );
}

function challenge(cast: TalentCast) {
  const { scene, player, learned, now, effectArea, classId, origin } = cast;

  const learnedIndex = learned === TALENT_MAX_RANK ? 1 : 0;
  state(player, scene).challengeHits = new Set();
  shield(
    player,
    scene,
    player.maxHitpoints * DEFENSE.challengeBarrier[learnedIndex],
    now + DEFENSE.challengeBarrierMs,
  );

  for (const enemy of effectArea(scene, origin, DEFENSE.challengeRadius[learnedIndex])) {
    if (classId === 'warrior') {
      enemy.challengedBy = player.id;
      enemy.challengedUntil = now + DEFENSE.challengeTauntMs;
    }

    enemy.attack = undefined;
    applyTalentAilment(enemy, player, 'roots', 1, now, DEFENSE.challengeRootsMs);
  }
}

function wall(cast: TalentCast) {
  const { scene, player, nodeId, learned, now, stats, recipient } = cast;

  const learnedIndex = learned === TALENT_MAX_RANK ? 1 : 0;
  const value = state(player, scene);
  value.wallUntil = now + DEFENSE.wallDurationMs[learnedIndex];
  value.wallRank = learned;
  value.wallPrevented = false;

  if (recipient) {
    heal(recipient, DEFENSE.wallHeal[learnedIndex]);
  }

  const shared = rank(player, 2, 8);

  if (shared) {
    schedule(
      scene,
      player,
      nodeId,
      now,
      value.wallUntil - now,
      DEFENSE.sharedIntervalMs,
      (at, players) => {
        for (const ally of players.filter((ally) => {
          return (
            ally !== player &&
            ally.hitpoints > 0 &&
            forestDistance(ally, player) <=
              DEFENSE.sharedRadius * (1 + stats.bonuses.areaOfEffect / PERCENT)
          );
        })) {
          shield(
            ally,
            scene,
            ally.maxHitpoints * DEFENSE.sharedBarrier[shared === TALENT_MAX_RANK ? 1 : 0],
            at + DEFENSE.sharedBarrierMs,
          );
        }
      },
    );
  }
}

const methods: Readonly<Record<number, (cast: TalentCast) => void>> = {
  0: guard,
  1: shelter,
  2: challenge,
};

export function defensive(cast: TalentCast) {
  const { scene, player, tier, effectArea, origin, now, context } = cast;
  (methods[tier] ?? wall)(cast);

  const unbroken = rank(player, 2, 9);
  const value = state(player, scene);

  if (unbroken && tier === 0 && value.wallPrevented) {
    value.wallPrevented = false;

    for (const enemy of effectArea(scene, origin, DEFENSE.unbrokenRadius)) {
      strike(
        scene,
        player,
        enemy,
        DEFENSE.unbrokenPower[unbroken === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][2][9],
        context,
      );
    }
  }
}
