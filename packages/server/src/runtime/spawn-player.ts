import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { CharacterStore } from '../characters.ts';
import type { World } from './models.ts';

export function spawnPlayer(
  world: World,
  playerId: string,
  playerName: string,
  character: ReturnType<CharacterStore['loadById']>,
) {
  const used = new Set(
    [...world.players.values()].map((p) => {
      return p.color;
    }),
  );
  let color = 0;
  while (used.has(color)) {
    color++;
  }

  world.players.set(playerId, {
    id: playerId,
    name: playerName,
    x: VILLAGE_DEFINITION.spawn.x + color * VILLAGE_DEFINITION.spawn.spacing,
    y: VILLAGE_DEFINITION.spawn.y,
    color,
    ...character.progress,
    classId: character.classId,
    classes: character.classes,
    hitpoints: character.progress.hitpoints || character.progress.maxHitpoints,
  });
}
