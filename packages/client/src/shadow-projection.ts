import type { Light } from './light.ts';
import type { DirectionalShadow } from './directional-shadow.ts';
import { SHADOW } from './shadow.ts';

export function shadowProjection(
  caster: { x: number; y: number; height: number },
  light?: Light,
  bottomInset = 0,
  directional: DirectionalShadow = { x: 0.6, y: 0.8, opacity: 0.26 },
) {
  if (!light) {
    return {
      x: directional.x * caster.height,
      y: directional.y * caster.height,
      opacity: directional.opacity,
    };
  }

  const dx = caster.x - light.x,
    dy = caster.y - bottomInset - light.y;
  const distance = Math.hypot(dx, dy);

  if (distance >= light.radius || distance < 1) {
    return null;
  }

  const length = Math.min(
    light.radius * SHADOW.maximumRadiusRatio,
    (distance * caster.height) / Math.max(SHADOW.minimumHeightGap, light.height - caster.height),
  );

  return {
    x: (dx / distance) * length,
    y: (dy / distance) * length,
    opacity: SHADOW.maximumOpacity * (1 - distance / light.radius),
  };
}
