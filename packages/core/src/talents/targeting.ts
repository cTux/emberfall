import {
  TALENT_MAX_RANK,
  TALENT_DEFENSIVE_COLUMN,
  TALENT_THIRD_TIER,
  TALENT_FINISHER_TIER,
  TALENT_ABILITY_ROWS,
  TALENT_ABILITIES_PER_COLUMN,
} from '../talent-catalog.ts';
import { PERCENT, wrap, wrappedDelta } from '@emberfall/common';
import { game, type createGame } from '../game.ts';
import type { DebuffKind, Player, SceneState } from '@emberfall/common';
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
const ailments = new Map<string, DebuffKind>([
  ['warrior', 'bleed'],
  ['ranger', 'poison'],
  ['mage', 'burn'],
]);
// Preserve the existing 700-unit default used by restoration's published healing range.
const DEFAULT_HEALING_RADIUS = 700;
// Existing 130-unit-wide warrior corridor; retained calibration keeps directional targeting unchanged.
const WARRIOR_HALF_WIDTH = 65;

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
  healingRadius = DEFAULT_HEALING_RADIUS,
  healBelow = 1,
  context: Game = game,
) {
  const effectArea = (scene: SceneState, point: { x: number; y: number }, radius: number) => {
    return area(scene, point, radius * (1 + stats.bonuses.areaOfEffect / PERCENT));
  };

  const column = Math.floor(slot / TALENT_ABILITIES_PER_COLUMN),
    tier = slot % TALENT_ABILITIES_PER_COLUMN;
  const classId = player.classId ?? 'warrior';
  const ability = TALENT_NAMES[classId][column][TALENT_ABILITY_ROWS[tier]];
  state(player, scene).stats = stats;
  const origin = { x: player.x, y: player.y };
  const distance = forestDistance(player, aim);
  const maxRange =
    (talentCast.classRange[classId] ?? talentCast.range) * (1 + stats.bonuses.range / PERCENT);

  if (distance > maxRange) {
    const dx = wrappedDelta(aim.x, player.x, FOREST.width),
      dy = wrappedDelta(aim.y, player.y, FOREST.height);
    aim = {
      x: wrap(player.x + (dx / distance) * maxRange, FOREST.width),
      y: wrap(player.y + (dy / distance) * maxRange, FOREST.height),
    };
  }

  const recipient =
    classId === 'druid' &&
    column === TALENT_DEFENSIVE_COLUMN &&
    (tier === 0 || tier === TALENT_FINISHER_TIER)
      ? healingTarget(players, player, origin, healingRadius, healBelow)
      : undefined;
  talentVisual(
    scene,
    player,
    column,
    recipient ?? (column === TALENT_DEFENSIVE_COLUMN ? origin : aim),
    now,
  );
  let targets = effectArea(
    scene,
    classId === 'warrior' && tier !== TALENT_THIRD_TIER ? origin : aim,
    talentCast.areaRadius[learned === TALENT_MAX_RANK ? 1 : 0],
  );
  const heading = Math.atan2(
    wrappedDelta(aim.y, player.y, FOREST.height),
    wrappedDelta(aim.x, player.x, FOREST.width),
  );

  if (classId === 'warrior' && column === 0 && (tier === 0 || tier === TALENT_THIRD_TIER)) {
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
              talentCast.areaRadius[learned === TALENT_MAX_RANK ? 1 : 0] *
                (1 + stats.bonuses.areaOfEffect / PERCENT)
        : forward >= 0 &&
            forward <= maxRange &&
            Math.abs(sideways) <= WARRIOR_HALF_WIDTH * (1 + stats.bonuses.areaOfEffect / PERCENT);
    });
  }

  const primary = [...scene.enemies]
    .filter((enemy) => {
      return (
        enemy.hitpoints > 0 &&
        forestDistance(enemy, aim) <
          talentCast.primaryRadius * (1 + stats.bonuses.areaOfEffect / PERCENT)
      );
    })
    .sort((a, b) => {
      return forestDistance(a, aim) - forestDistance(b, aim);
    })[0];
  const ailment = ailments.get(classId) ?? 'roots';

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
