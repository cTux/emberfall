import type { InteractionTarget } from './interaction-target.ts';
import { INTERACTION_GEOMETRY } from './interaction-geometry.ts';
import type { Player } from '@emberfall/common';
import { forestDistance } from '@emberfall/core';

export function interactionInRange(target: InteractionTarget, player: Player | undefined) {
  return (
    !!player &&
    player.hitpoints > 0 &&
    forestDistance(
      {
        x: player.x,
        y:
          player.y +
          (target.source.id.startsWith('gather:') || player.scene !== 'forest'
            ? INTERACTION_GEOMETRY.feetOffset
            : 0),
      },
      target.reach,
    ) < target.radius
  );
}
