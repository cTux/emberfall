import { TALENT_MAX_RANK, TALENT_THIRD_TIER, TALENT_FINISHER_TIER } from '../talent-catalog.ts';
import { PERCENT, wrap, wrappedDelta } from '@emberfall/common';
import { offensiveFollowups } from './offensive-followups.ts';
import { OFFENSE } from './offensive-tuning.ts';
import type { TalentCast } from './targeting.ts';
import type { Enemy, Player } from '@emberfall/common';
import { forestDistance, FOREST } from '../scene.ts';
import { rank, applyTalentAilment } from '../talent-ailments.ts';
import { TALENT_NAMES } from '../talent-tree.ts';
import { schedule, deepCuts } from './state.ts';
import { talentVisual, strike } from './effects.ts';
import { talentWeaponHit } from './passives.ts';

export function offensive(cast: TalentCast) {
  const {
    context,
    scene,
    player,
    nodeId,
    learned,
    aim,
    now,
    stats,
    effectArea,
    column,
    tier,
    classId,
    ability,
    maxRange,
    targets,
    heading,
    primary,
    ailment,
  } = cast;
  const learnedIndex = learned === TALENT_MAX_RANK ? 1 : 0;
  const hitIds = new Set<number>();
  const hit = (enemy: Enemy, at: number, scale: number) => {
    hitIds.add(enemy.id);
    const copies =
      1 +
      (classId === 'warrior'
        ? stats.bonuses.additionalAttack
        : classId === 'mage'
          ? stats.bonuses.moreProjectiles
          : 0);

    for (let copy = 0; copy < copies && enemy.hitpoints > 0; copy++) {
      strike(scene, player, enemy, scale, at, ability, context);

      if (classId === 'warrior' && stats.bonuses.additionalAttack > 0) {
        talentWeaponHit(scene, player, enemy, at, false, stats, context);
      }

      const serrated = rank(player, 1, 2);

      if (
        column === 0 &&
        serrated &&
        context.random() < OFFENSE.serratedChance[serrated === TALENT_MAX_RANK ? 1 : 0]
      ) {
        applyTalentAilment(enemy, player, ailment, 1, at, undefined, stats);
      }

      if (column === 1) {
        applyTalentAilment(
          enemy,
          player,
          ailment,
          OFFENSE.ailmentStacks[learnedIndex],
          at,
          undefined,
          stats,
        );
      }

      const deep = rank(player, 1, 9);

      if (
        deep &&
        enemy.debuffs?.some((entry) => {
          return (
            entry.ownerId === player.id &&
            entry.stacks >= OFFENSE.deepCutsStacks &&
            entry.expiresAt > at
          );
        }) &&
        context.random() < OFFENSE.deepCutsChance[deep === TALENT_MAX_RANK ? 1 : 0] &&
        at >= (deepCuts.get(enemy)?.get(player) ?? 0)
      ) {
        const timers = deepCuts.get(enemy) ?? new WeakMap<Player, number>();
        timers.set(player, at + OFFENSE.deepCutsCooldownMs);
        deepCuts.set(enemy, timers);
        strike(
          scene,
          player,
          enemy,
          OFFENSE.deepCutsPower[deep === TALENT_MAX_RANK ? 1 : 0],
          at,
          TALENT_NAMES[player.classId ?? 'warrior'][1][9],
          context,
        );
      }
    }
  };

  if (tier === 1 && column === 1 && primary) {
    hit(primary, now, OFFENSE.pullPower[learnedIndex]);

    if (primary.kind !== 'boss') {
      primary.x = wrap(
        player.x + wrappedDelta(primary.x, player.x, FOREST.width) * OFFENSE.pullDistanceFraction,
        FOREST.width,
      );
      primary.y = wrap(
        player.y + wrappedDelta(primary.y, player.y, FOREST.height) * OFFENSE.pullDistanceFraction,
        FOREST.height,
      );
    }

    const trail = rank(player, 1, 4);

    if (trail) {
      for (const enemy of effectArea(scene, primary, OFFENSE.trailRadius)) {
        applyTalentAilment(enemy, player, ailment, trail, now, undefined, stats);
      }
    }
  } else if ((tier === 1 && column === 0) || (tier === TALENT_FINISHER_TIER && column === 1)) {
    const count = column === 0 ? OFFENSE.whirlwindHits : OFFENSE.cycloneHits;
    schedule(
      scene,
      player,
      nodeId,
      now,
      (count - 1) * OFFENSE.repeatedHitIntervalMs,
      OFFENSE.repeatedHitIntervalMs,
      (at) => {
        for (const enemy of effectArea(
          scene,
          column === 0 ? player : aim,
          OFFENSE.repeatedHitRadius[learnedIndex],
        )) {
          hit(
            enemy,
            at,
            column === 0
              ? OFFENSE.whirlwindPower[learnedIndex]
              : OFFENSE.cyclonePower[learnedIndex],
          );
        }

        talentVisual(scene, player, column, column === 0 ? player : aim, at);
        const advancing = rank(player, 0, 4);

        if (column === 0 && advancing && at === now + (count - 1) * OFFENSE.repeatedHitIntervalMs) {
          for (const enemy of effectArea(scene, aim, OFFENSE.advancingRadius)) {
            strike(
              scene,
              player,
              enemy,
              OFFENSE.advancingPower[advancing === TALENT_MAX_RANK ? 1 : 0],
              at,
              TALENT_NAMES[player.classId ?? 'warrior'][0][4],
              context,
            );
          }
        }
      },
    );
  } else {
    for (const enemy of tier === TALENT_FINISHER_TIER ? (primary ? [primary] : []) : targets) {
      hit(
        enemy,
        now,
        tier === TALENT_FINISHER_TIER &&
          enemy.hitpoints <
            (enemy.maxHitpoints ?? enemy.hitpoints) * OFFENSE.executionHealthFraction
          ? OFFENSE.executionPower[learnedIndex]
          : OFFENSE.directPower[learnedIndex],
      );
    }
  }

  if (column === 0 && (tier === 0 || tier === TALENT_THIRD_TIER || tier === TALENT_FINISHER_TIER)) {
    let previous = primary ?? targets[0];
    const extras =
      classId === 'druid'
        ? stats.bonuses.projectilesBounce
        : classId === 'ranger'
          ? stats.bonuses.projectilePierce
          : 0;

    for (let extra = 0; previous && extra < extras; extra++) {
      const next = scene.enemies
        .filter((enemy) => {
          if (enemy.hitpoints <= 0 || hitIds.has(enemy.id)) {
            return false;
          }

          if (classId === 'druid') {
            return (
              forestDistance(previous, enemy) <=
              OFFENSE.bounceRadius * (1 + stats.bonuses.range / PERCENT)
            );
          }

          const dx = wrappedDelta(enemy.x, player.x, FOREST.width);
          const dy = wrappedDelta(enemy.y, player.y, FOREST.height);

          return (
            dx * Math.cos(heading) + dy * Math.sin(heading) >= 0 &&
            Math.abs(-dx * Math.sin(heading) + dy * Math.cos(heading)) <= OFFENSE.pierceHalfWidth &&
            forestDistance(player, enemy) <= maxRange
          );
        })
        .sort((a, b) => {
          return forestDistance(previous, a) - forestDistance(previous, b);
        })[0];

      if (!next) {
        break;
      }

      hit(next, now, OFFENSE.directPower[learnedIndex]);
      previous = next;
    }
  }

  const second = column === 0 ? rank(player, column, 2) : 0;

  if (
    second &&
    tier === 0 &&
    context.random() < OFFENSE.secondImpactChance[second === TALENT_MAX_RANK ? 1 : 0]
  ) {
    schedule(scene, player, nodeId, now + OFFENSE.secondImpactDelayMs, 0, 1, (at) => {
      for (const enemy of effectArea(scene, aim, OFFENSE.secondImpactRadius)) {
        hit(enemy, at, OFFENSE.secondImpactPower[learnedIndex]);
      }
    });
  }

  offensiveFollowups(cast);
}
