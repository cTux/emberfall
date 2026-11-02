import type { Scheduled } from './scheduled.ts';
import { scheduled } from './scheduled-definition.ts';
import { generations } from './generations.ts';
import type { SceneState, Player } from '@emberfall/common';

export function schedule(
  scene: SceneState,
  owner: Player,
  nodeId: string,
  at: number,
  duration: number,
  interval: number,
  run: Scheduled['run'],
) {
  const entries = scheduled.get(scene) ?? [];
  entries.push({
    generation: generations.get(owner) ?? 0,
    at,
    until: at + duration,
    interval,
    owner,
    classId: owner.classId ?? 'warrior',
    nodeId,
    run,
  });
  scheduled.set(scene, entries);
}
