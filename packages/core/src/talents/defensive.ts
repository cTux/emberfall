import type { TalentCast } from './targeting.ts';
import { forestDistance } from '../scene.ts';
import { healingTarget } from '../tactics.ts';
import { rank, applyTalentAilment } from '../talent-ailments.ts';
import { TALENT_NAMES } from '../talent-tree.ts';
import { state, schedule } from './state.ts';
import { control, strike, heal, shield } from './effects.ts';

export function defensive(cast: TalentCast) {
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
    tier,
    classId,
    ability,
    origin,
    recipient,
  } = cast;

  if (tier === 0) {
    if (classId === 'druid') {
      if (recipient) {
        heal(recipient, learned === 2 ? 0.2 : 0.12);
      }
    } else {
      for (const enemy of effectArea(scene, origin, 150)) {
        strike(scene, player, enemy, learned === 2 ? 1.4 : 0.9, now, ability, context);
        applyTalentAilment(enemy, player, 'roots', 1, now, learned === 2 ? 1000 : 600);
        enemy.attack = undefined;
        control(enemy, now, learned === 2 ? 1000 : 600);
      }
    }

    const fragments = rank(player, 2, 2);

    if (fragments) {
      for (const enemy of effectArea(scene, aim, 250).slice(0, fragments === 2 ? 4 : 2)) {
        strike(
          scene,
          player,
          enemy,
          fragments === 2 ? 0.5 : 0.35,
          now,
          TALENT_NAMES[player.classId ?? 'warrior'][2][2],
          context,
        );
      }
    }
  } else if (tier === 1) {
    schedule(scene, player, nodeId, now, 5000, 1000, (at, players) => {
      if (classId === 'druid') {
        const ally = healingTarget(
          players,
          player,
          origin,
          200 * (1 + stats.bonuses.areaOfEffect / 100),
        );

        if (ally) {
          heal(ally, learned === 2 ? 0.04 : 0.025);
        }
      } else {
        for (const ally of players.filter((ally) => {
          return (
            ally.hitpoints > 0 &&
            forestDistance(ally, origin) <= 200 * (1 + stats.bonuses.areaOfEffect / 100)
          );
        })) {
          shield(ally, scene, player.maxHitpoints * (learned === 2 ? 0.1 : 0.06), at + 1200);
        }
      }

      const hold = rank(player, 2, 4);

      if (hold) {
        for (const enemy of effectArea(scene, origin, 200)) {
          applyTalentAilment(enemy, player, 'roots', 1, at, hold === 2 ? 1400 : 800);
          control(enemy, at, hold === 2 ? 1400 : 800);
        }
      }
    });
  } else if (tier === 2) {
    state(player, scene).challengeHits = new Set();
    shield(player, scene, player.maxHitpoints * (learned === 2 ? 0.25 : 0.15), now + 5000);

    for (const enemy of effectArea(scene, origin, learned === 2 ? 250 : 200)) {
      if (classId === 'warrior') {
        enemy.challengedBy = player.id;
        enemy.challengedUntil = now + 3000;
      }

      enemy.attack = undefined;
      applyTalentAilment(enemy, player, 'roots', 1, now, 1000);
    }
  } else {
    const value = state(player, scene);
    value.wallUntil = now + (learned === 2 ? 3000 : 2000);
    value.wallRank = learned;
    value.wallPrevented = false;

    if (recipient) {
      heal(recipient, learned === 2 ? 0.35 : 0.2);
    }

    const shared = rank(player, 2, 8);

    if (shared) {
      schedule(scene, player, nodeId, now, value.wallUntil - now, 500, (at, players) => {
        for (const ally of players.filter((ally) => {
          return (
            ally !== player &&
            ally.hitpoints > 0 &&
            forestDistance(ally, player) <= 160 * (1 + stats.bonuses.areaOfEffect / 100)
          );
        })) {
          shield(ally, scene, ally.maxHitpoints * (shared === 2 ? 0.05 : 0.03), at + 1000);
        }
      });
    }
  }

  const unbroken = rank(player, 2, 9);
  const value = state(player, scene);

  if (unbroken && tier === 0 && value.wallPrevented) {
    value.wallPrevented = false;

    for (const enemy of effectArea(scene, origin, 150)) {
      strike(
        scene,
        player,
        enemy,
        unbroken === 2 ? 1.12 : 0.45,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][2][9],
        context,
      );
    }
  }
}
