import type { SceneState } from '@emberfall/common';
import type { Scene } from './scenes.ts';

export function sceneState(scene?: Scene): SceneState | undefined {
  if (!scene) {
    return undefined;
  }

  const {
    id,
    type,
    difficulty,
    dimension,
    phase,
    ready,
    countdownAt,
    endsAt,
    enemies,
    damage,
    portals,
    sequence,
    nextSpawn,
    bossId,
    spawnCount,
    spawns,
    projectiles,
    drops,
    playerShots,
    explosions,
    pausedAt,
  } = scene;

  return {
    id,
    type,
    difficulty,
    dimension,
    phase,
    ready,
    countdownAt,
    endsAt,
    enemies,
    damage,
    portals,
    sequence,
    nextSpawn,
    bossId,
    spawnCount,
    spawns,
    projectiles,
    drops,
    playerShots,
    explosions,
    pausedAt,
  };
}
