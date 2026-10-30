import type { Player, SceneState } from '@emberfall/common';
import type { Scenery } from './village';
import type { createCritterMotion } from './critter-motion';

export function villageLayers(
  visibleScenery: Scenery[],
  players: Player[],
  critters: ReturnType<ReturnType<typeof createCritterMotion>>,
  training: SceneState | undefined,
  portal: { x: number; y: number },
) {
  return [
    {
      y: portal.y + 8,
      object: null,
      player: null,
      bear: null,
      critter: null,
      portal,
      dummy: null,
    },
    ...visibleScenery.map((object) => ({
      y: object.y,
      object,
      player: null,
      bear: null,
      critter: null,
      portal: null,
      dummy: null,
    })),
    ...players.map((player) => ({
      y: player.y + 15,
      object: null,
      player,
      bear: null,
      critter: null,
      portal: null,
      dummy: null,
    })),
    ...players.flatMap((p) =>
      p.bear
        ? [
            {
              y: p.bear.y + 18,
              object: null,
              player: null,
              bear: p.bear,
              critter: null,
              portal: null,
              dummy: null,
            },
          ]
        : [],
    ),
    ...critters.map((critter) => ({
      y: critter.y,
      object: null,
      player: null,
      bear: null,
      critter,
      portal: null,
      dummy: null,
    })),
    ...(training?.enemies ?? []).map((dummy) => ({
      y: dummy.y + 15,
      object: null,
      player: null,
      bear: null,
      critter: null,
      portal: null,
      dummy,
    })),
  ].sort((a, b) => a.y - b.y);
}
export type VillageLayer = ReturnType<typeof villageLayers>[number];
