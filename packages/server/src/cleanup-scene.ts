import type { SceneWorld } from './scene-world.ts';

export function cleanupScene(world: SceneWorld) {
  if (
    world.scene &&
    world.scene.phase === 'ended' &&
    ![...world.players.values()].some((p) => {
      return p.scene === 'forest';
    })
  ) {
    world.scene = undefined;
  }
}
