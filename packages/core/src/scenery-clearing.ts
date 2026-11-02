import { TRAINING_ZONES, BUILDINGS, TORCHES } from './definitions/worlds/village.ts';
import { SCENERY_CLEARANCE, PLAZA } from './village-layout.ts';
import { onPath } from './village-paths.ts';

export function sceneryClearing(x: number, y: number) {
  return (
    TRAINING_ZONES.some((zone) => {
      return Math.hypot(x - zone.x, y - zone.y) < zone.clearingRadius + SCENERY_CLEARANCE.training;
    }) ||
    Math.hypot((x - PLAZA.x) / PLAZA.clearingX, (y - PLAZA.y) / PLAZA.clearingY) < 1 ||
    onPath(x, y, SCENERY_CLEARANCE.path) ||
    BUILDINGS.some((b) => {
      return (
        Math.abs(x - b.x) < SCENERY_CLEARANCE.buildingX &&
        y > b.y - SCENERY_CLEARANCE.buildingAbove &&
        y < b.y + SCENERY_CLEARANCE.buildingBelow
      );
    }) ||
    TORCHES.some((t) => {
      return Math.hypot(t.x - x, t.y - y) < SCENERY_CLEARANCE.torch;
    })
  );
}
