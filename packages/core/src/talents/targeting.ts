import { game, type createGame } from '../game.ts';
import type { DebuffKind, Player, SceneState } from '@emberfall/common';
import { wrap, wrappedDelta } from '@emberfall/common';
import { forestDistance, FOREST } from '../scene.ts';
import { healingTarget } from '../tactics.ts';
import { TALENT_NAMES } from '../talent-tree.ts';
import { characterStats } from '../equipment.ts';
import type { CharacterStats } from '../content/rules.ts';
import { talentArea as area } from '../talent-ailments.ts';
import { state } from './state.ts';
import { talentVisual } from './effects.ts';
import { talentCast } from '../configs/talentCast.ts';

type Game = ReturnType<typeof createGame>;
export function prepareTalentCast(
  scene: SceneState,
  player: Player,
  slot: number,
  nodeId: string,
  learned: number,
  aim: { x: number; y: number },
  now: number,
  stats: CharacterStats = characterStats(player),
  players: Player[] = [player],
  healingRadius = 700,
  healBelow = 1,
  context: Game = game,
) {
  const effectArea = (scene: SceneState, point: { x: number; y: number }, radius: number) => {
    return area(scene, point, radius * (1 + stats.bonuses.areaOfEffect / 100));
  };

  const column = Math.floor(slot / 4),
    tier = slot % 4;
  const classId = player.classId ?? 'warrior';
  const ability = TALENT_NAMES[classId][column][[1, 3, 5, 7][tier]];
  state(player, scene).stats = stats;
  const origin = { x: player.x, y: player.y };
  const distance = forestDistance(player, aim);
  const maxRange =
    (talentCast.classRange[classId] ?? talentCast.range) * (1 + stats.bonuses.range / 100);

  if (distance > maxRange) {
    const dx = wrappedDelta(aim.x, player.x, FOREST.width),
      dy = wrappedDelta(aim.y, player.y, FOREST.height);
    aim = {
      x: wrap(player.x + (dx / distance) * maxRange, FOREST.width),
      y: wrap(player.y + (dy / distance) * maxRange, FOREST.height),
    };
  }

  const recipient =
    classId === 'druid' && column === 2 && (tier === 0 || tier === 3)
      ? healingTarget(players, player, origin, healingRadius, healBelow)
      : undefined;
  talentVisual(scene, player, column, recipient ?? (column === 2 ? origin : aim), now);
  let targets = effectArea(
    scene,
    classId === 'warrior' && tier !== 2 ? origin : aim,
    talentCast.areaRadius[learned === 2 ? 1 : 0],
  );
  const heading = Math.atan2(
    wrappedDelta(aim.y, player.y, FOREST.height),
    wrappedDelta(aim.x, player.x, FOREST.width),
  );

  if (classId === 'warrior' && column === 0 && (tier === 0 || tier === 2)) {
    targets = scene.enemies.filter((enemy) => {
      if (enemy.hitpoints <= 0) {
        return false;
      }

      const dx = wrappedDelta(enemy.x, player.x, FOREST.width),
        dy = wrappedDelta(enemy.y, player.y, FOREST.height);
      const forward = dx * Math.cos(heading) + dy * Math.sin(heading),
        sideways = -dx * Math.sin(heading) + dy * Math.cos(heading);

      return tier === 0
        ? forward >= 0 &&
            Math.hypot(dx, dy) <=
              talentCast.areaRadius[learned === 2 ? 1 : 0] * (1 + stats.bonuses.areaOfEffect / 100)
        : forward >= 0 &&
            forward <= maxRange &&
            Math.abs(sideways) <= 65 * (1 + stats.bonuses.areaOfEffect / 100);
    });
  }

  const primary = [...scene.enemies]
    .filter((enemy) => {
      return (
        enemy.hitpoints > 0 &&
        forestDistance(enemy, aim) <
          talentCast.primaryRadius * (1 + stats.bonuses.areaOfEffect / 100)
      );
    })
    .sort((a, b) => {
      return forestDistance(a, aim) - forestDistance(b, aim);
    })[0];
  const ailment: DebuffKind =
    classId === 'warrior'
      ? 'bleed'
      : classId === 'ranger'
        ? 'poison'
        : classId === 'mage'
          ? 'burn'
          : 'roots';

  return {
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
    origin,
    maxRange,
    recipient,
    targets,
    heading,
    primary,
    ailment,
  };
}

export type TalentCast = ReturnType<typeof prepareTalentCast>;
