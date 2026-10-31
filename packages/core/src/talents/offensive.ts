import type { TalentCast } from './targeting.ts';
import type { Enemy, Player } from '@emberfall/common';
import { wrap, wrappedDelta } from '@emberfall/common';
import { forestDistance, FOREST } from '../scene.ts';
import { rank, applyTalentAilment } from '../talent-ailments.ts';
import { TALENT_NAMES } from '../talent-tree.ts';
import { state, schedule, deepCuts } from './state.ts';
import { talentVisual, strike } from './effects.ts';
import { talentWeaponHit } from './passives.ts';

export function offensive(cast: TalentCast) {
  const {
    context,
    scene,
    player,
    slot,
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
      if (classId === 'warrior' && stats.bonuses.additionalAttack > 0)
        talentWeaponHit(scene, player, enemy, at, false, stats, context);
      const serrated = rank(player, 1, 2);
      if (column === 0 && serrated && context.random() < (serrated === 2 ? 0.45 : 0.25))
        applyTalentAilment(enemy, player, ailment, 1, at, undefined, stats);
      if (column === 1)
        applyTalentAilment(enemy, player, ailment, learned === 2 ? 3 : 2, at, undefined, stats);
      const deep = rank(player, 1, 9);
      if (
        deep &&
        enemy.debuffs?.some(
          (entry) => entry.ownerId === player.id && entry.stacks >= 5 && entry.expiresAt > at,
        ) &&
        context.random() < (deep === 2 ? 0.35 : 0.2) &&
        at >= (deepCuts.get(enemy)?.get(player) ?? 0)
      ) {
        const timers = deepCuts.get(enemy) ?? new WeakMap<Player, number>();
        timers.set(player, at + 2000);
        deepCuts.set(enemy, timers);
        strike(
          scene,
          player,
          enemy,
          deep === 2 ? 1.3 : 0.8,
          at,
          TALENT_NAMES[player.classId ?? 'warrior'][1][9],
          context,
        );
      }
    }
  };

  if (tier === 1 && column === 1 && primary) {
    hit(primary, now, learned === 2 ? 1.5 : 1);
    if (primary.kind !== 'boss') {
      primary.x = wrap(
        player.x + wrappedDelta(primary.x, player.x, FOREST.width) * 0.25,
        FOREST.width,
      );
      primary.y = wrap(
        player.y + wrappedDelta(primary.y, player.y, FOREST.height) * 0.25,
        FOREST.height,
      );
    }

    const trail = rank(player, 1, 4);
    if (trail)
      for (const enemy of effectArea(scene, primary, 150))
        applyTalentAilment(enemy, player, ailment, trail, now, undefined, stats);
  } else if ((tier === 1 && column === 0) || (tier === 3 && column === 1)) {
    const count = column === 0 ? 3 : 4;
    schedule(scene, player, nodeId, now, (count - 1) * 500, 500, (at) => {
      for (const enemy of effectArea(scene, column === 0 ? player : aim, learned === 2 ? 170 : 125))
        hit(enemy, at, column === 0 ? (learned === 2 ? 0.65 : 0.45) : learned === 2 ? 0.45 : 0.3);
      talentVisual(scene, player, column, column === 0 ? player : aim, at);
      const advancing = rank(player, 0, 4);
      if (column === 0 && advancing && at === now + (count - 1) * 500)
        for (const enemy of effectArea(scene, aim, 220))
          strike(
            scene,
            player,
            enemy,
            advancing === 2 ? 1.1 : 0.7,
            at,
            TALENT_NAMES[player.classId ?? 'warrior'][0][4],
            context,
          );
    });
  } else
    for (const enemy of tier === 3 ? (primary ? [primary] : []) : targets)
      hit(
        enemy,
        now,
        tier === 3 && enemy.hitpoints < (enemy.maxHitpoints ?? enemy.hitpoints) * 0.3
          ? learned === 2
            ? 4
            : 3
          : learned === 2
            ? 2.1
            : 1.5,
      );
  if (column === 0 && (tier === 0 || tier === 2 || tier === 3)) {
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
          if (enemy.hitpoints <= 0 || hitIds.has(enemy.id)) return false;
          if (classId === 'druid')
            return forestDistance(previous, enemy) <= 300 * (1 + stats.bonuses.range / 100);
          const dx = wrappedDelta(enemy.x, player.x, FOREST.width);
          const dy = wrappedDelta(enemy.y, player.y, FOREST.height);

          return (
            dx * Math.cos(heading) + dy * Math.sin(heading) >= 0 &&
            Math.abs(-dx * Math.sin(heading) + dy * Math.cos(heading)) <= 32 &&
            forestDistance(player, enemy) <= maxRange
          );
        })
        .sort((a, b) => forestDistance(previous, a) - forestDistance(previous, b))[0];
      if (!next) break;
      hit(next, now, learned === 2 ? 2.1 : 1.5);
      previous = next;
    }
  }

  const second = column === 0 ? rank(player, column, 2) : 0;
  if (second && tier === 0 && context.random() < (second === 2 ? 0.5 : 0.25))
    schedule(scene, player, nodeId, now + 300, 0, 1, (at) => {
      for (const enemy of effectArea(scene, aim, 125)) hit(enemy, at, learned === 2 ? 1.05 : 0.75);
    });
  const value = state(player, scene);
  if (column === 0 && tier === 2 && rank(player, 0, 6))
    value.fissure = { ...aim, until: now + 4000 };
  else if (tier === 0 && value.fissure && value.fissure.until > now) {
    for (const enemy of effectArea(scene, value.fissure, 170))
      strike(
        scene,
        player,
        enemy,
        rank(player, 0, 6) === 2 ? 1.5 : 0.9,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][6],
        context,
      );
    value.fissure = undefined;
  }

  const momentum = rank(player, 0, 8);
  if (column === 0 && tier === 3 && primary && primary.hitpoints <= 0 && momentum) {
    const id = `talent:${classId}:${slot}`;
    player.talentCooldowns![id] = Math.max(
      now,
      player.talentCooldowns![id] - (momentum === 2 ? 12000 : 6000),
    );
    value.empoweredUntil = now + 6000;
  }

  if (tier === 0 && value.empoweredUntil && value.empoweredUntil > now) {
    value.empoweredUntil = undefined;
    for (const enemy of targets)
      strike(
        scene,
        player,
        enemy,
        momentum === 2 ? 0.75 : 0.5,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][8],
        context,
      );
  }

  value.sequence = value.sequence.filter((entry) => now - entry.at <= 6000 && entry.slot !== slot);
  value.sequence.push({ slot, at: now });
  const rhythm = rank(player, 0, 9);
  if (rhythm && value.sequence.length >= 3 && now >= value.rhythmAt) {
    value.rhythmAt = now + 8000;
    value.sequence = [];
    for (const enemy of effectArea(scene, player, 200))
      strike(
        scene,
        player,
        enemy,
        rhythm === 2 ? 1.6 : 1,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][0][9],
        context,
      );
  }
}
