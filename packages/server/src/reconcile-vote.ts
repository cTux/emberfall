import type { SceneWorld } from './scene-world.ts';
import { FOREST_DEFINITION } from '@emberfall/core/definitions/worlds/forest';

export function reconcileVote(world: SceneWorld, now: number) {
  const scene = world.scene;

  if (!scene || !['voting', 'countdown'].includes(scene.phase)) {
    return;
  }

  const ids = (
    world.voters?.map((p) => {
      return p.id;
    }) ?? [...world.players.keys()]
  ).sort();
  const electorate = ids.join(',');

  if (scene.electorate !== electorate) {
    scene.countdownAt = null;
    scene.electorate = electorate;
  }

  scene.ready = scene.ready.filter((id) => {
    return ids.includes(id);
  });

  if (
    ids.length &&
    ids.every((id) => {
      return scene.ready.includes(id);
    })
  ) {
    scene.countdownAt ??= now + FOREST_DEFINITION.countdownMs;
    scene.phase = 'countdown';
  } else {
    scene.phase = 'voting';
    scene.countdownAt = null;
  }
}
