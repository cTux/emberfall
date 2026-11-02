import { PATHS } from './paths.ts';
import { PATH_CLEARANCE, PLAZA } from './village-layout.ts';

// Sample gentle Bezier bends once so drawing and vegetation clearance share the same route.

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
