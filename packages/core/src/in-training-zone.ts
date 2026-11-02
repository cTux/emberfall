import { TRAINING_ZONES, ARENA } from './definitions/worlds/village.ts';
import { wrappedDelta } from '@emberfall/common';
import { COLLISION } from './definitions/collision.ts';
import { TRAINING_FOOTPRINT } from './village-layout.ts';

export const inTrainingZone = (player: { x: number; y: number }) => {
  return TRAINING_ZONES.some((zone) => {
    return (
      Math.hypot(
        wrappedDelta(player.x, zone.x, ARENA.width) / zone.radius,
        wrappedDelta(player.y + COLLISION.feetOffset, zone.y, ARENA.height) /
          (zone.radius * TRAINING_FOOTPRINT.yScale),
      ) <= 1
    );
  });
};
