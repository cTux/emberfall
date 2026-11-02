import type { Caster } from './caster.ts';
import type { Light } from './light.ts';
import { maskBottomInsets } from './mask-bottom-insets.ts';
import { shadowProjection } from './shadow-projection.ts';
import type { DrawingContext } from './rendering/drawing-context';

// Existing local-light projection caps stretch before near-equal light/caster heights create enormous silhouettes.

export function castShadow(ctx: DrawingContext, caster: Caster, light?: Light) {
  if (light?.owner === caster.id) {
    return;
  }

  const bottomInset = (maskBottomInsets.get(caster.mask) ?? 0) * caster.height;
  const projection = shadowProjection(caster, light, bottomInset, ctx.directionalShadow);

  if (!projection || projection.opacity <= 0) {
    return;
  }

  ctx.save();
  ctx.occlusion = false;
  ctx.globalAlpha = projection.opacity;
  ctx.translate(caster.x, caster.y - bottomInset);
  ctx.transform(1, 0, -projection.x / caster.height, -projection.y / caster.height, 0, 0);
  ctx.drawImage(
    caster.mask,
    -caster.width / 2,
    -caster.height + bottomInset,
    caster.width,
    caster.height,
  );
  ctx.restore();
}
