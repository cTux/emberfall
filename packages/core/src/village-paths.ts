import { PATH_CURVES } from './definitions/worlds/village.ts';
import { PATH_SEGMENTS, CUBIC_BEZIER_DEGREE, PLAZA, PATH_CLEARANCE } from './village-layout.ts';

// Sample gentle Bezier bends once so drawing and vegetation clearance share the same route.
export const PATHS = PATH_CURVES.map(([start, bend1, bend2, end]) => {
  return Array.from({ length: PATH_SEGMENTS + 1 }, (_, step) => {
    const t = step / PATH_SEGMENTS,
      u = 1 - t;

    return {
      x:
        u ** CUBIC_BEZIER_DEGREE * start.x +
        CUBIC_BEZIER_DEGREE * u ** 2 * t * bend1.x +
        CUBIC_BEZIER_DEGREE * u * t ** 2 * bend2.x +
        t ** CUBIC_BEZIER_DEGREE * end.x,
      y:
        u ** CUBIC_BEZIER_DEGREE * start.y +
        CUBIC_BEZIER_DEGREE * u ** 2 * t * bend1.y +
        CUBIC_BEZIER_DEGREE * u * t ** 2 * bend2.y +
        t ** CUBIC_BEZIER_DEGREE * end.y,
    };
  });
});
export function onPath(x: number, y: number, margin = PATH_CLEARANCE) {
  if (Math.hypot((x - PLAZA.x) / PLAZA.pathX, (y - PLAZA.y) / PLAZA.pathY) < 1) {
    return true;
  }

  return PATHS.some((path) => {
    return path.some((point, index) => {
      const next = path[index + 1];

      if (!next) {
        return false;
      }

      const dx = next.x - point.x,
        dy = next.y - point.y;
      const t = Math.max(
        0,
        Math.min(1, ((x - point.x) * dx + (y - point.y) * dy) / (dx * dx + dy * dy)),
      );

      return Math.hypot(x - point.x - t * dx, y - point.y - t * dy) < margin;
    });
  });
}
