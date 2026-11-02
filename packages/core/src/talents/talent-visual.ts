import type { SceneState, Player } from '@emberfall/core/contracts';
import { appendSceneEntities } from '@emberfall/core/contracts';

// Retain the one-second talent flash so visual effects outlast a single simulation tick.
const TALENT_VISUAL_MS = 1000;

export function talentVisual(
  scene: SceneState,
  player: Player,
  column: number,
  point: { x: number; y: number },
  now: number,
) {
  appendSceneEntities(scene, 'explosions', {
    ownerId: player.id,
    id: ++scene.sequence,
    x: point.x,
    y: point.y,
    at: now,
    talentClass: player.classId ?? 'warrior',
    talentColumn: column,
    durationMs: TALENT_VISUAL_MS,
  });
}
