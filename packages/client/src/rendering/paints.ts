import { RENDER_TUNING as TUNING } from './tuning.ts';
import { Color, Matrix, Texture, type GradientOptions, type LinearGradientOptions } from 'pixi.js';

export type Paint = string | Gradient;

export class Gradient {
  options: GradientOptions;

  constructor(options: GradientOptions) {
    this.options = options;
  }

  addColorStop(offset: number, color: string) {
    (this.options.colorStops ??= []).push({ offset, color });
  }
}

export class Paints {
  private colors = new Map<string, Color>();

  color(value: string) {
    let color = this.colors.get(value);

    if (!color) {
      color = new Color(value);

      if (this.colors.size >= TUNING.colorCacheEntries) {
        this.colors.delete(this.colors.keys().next().value!);
      }

      this.colors.set(value, color);
    }

    return color;
  }

  private entries = new Map<string, { texture: Texture; used: number }>();

  get size() {
    return this.entries.size;
  }

  paint(
    value: Paint,
    frame: number,
  ): string | { texture: Texture; matrix: Matrix; textureSpace: 'global' } {
    if (typeof value === 'string') {
      return value;
    }

    const options = value.options;
    // Texture ramps depend on color stops and relative shape, not world position.
    // Moving the camera or a light only changes its matrix, never allocates a ramp.
    let normalized: GradientOptions;
    let matrix: Matrix;

    if (options.type === 'radial') {
      const outer = options.outerCenter!,
        center = options.center!,
        radius = Math.max(TUNING.minimumGradientExtent, options.outerRadius!);
      normalized = {
        type: 'radial',
        textureSpace: 'global',
        center: { x: (center.x - outer.x) / radius, y: (center.y - outer.y) / radius },
        outerCenter: { x: 0, y: 0 },
        innerRadius: options.innerRadius! / radius,
        outerRadius: 1,
        colorStops: options.colorStops,
      };
      matrix = new Matrix(
        (radius * 2) / TUNING.gradientSize,
        0,
        0,
        (radius * 2) / TUNING.gradientSize,
        outer.x - radius,
        outer.y - radius,
      );
    } else {
      const linear = options as LinearGradientOptions;
      const start = linear.start!,
        end = linear.end!,
        dx = end.x - start.x,
        dy = end.y - start.y;
      const distance = Math.max(TUNING.minimumGradientExtent, Math.hypot(dx, dy));
      normalized = {
        type: 'linear',
        textureSpace: 'global',
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
        colorStops: options.colorStops,
      };
      matrix = new Matrix(
        dx / TUNING.gradientSize,
        dy / TUNING.gradientSize,
        -dy / distance,
        dx / distance,
        start.x,
        start.y,
      );
    }

    const key = JSON.stringify(normalized);
    let entry = this.entries.get(key);

    if (!entry) {
      // Bake only the reusable ramp, on a transparent surface. FillGradient's
      // radial builder pre-fills the outer stop, making transparent centers opaque.
      const canvas = document.createElement('canvas');
      canvas.width = TUNING.gradientSize;
      canvas.height = normalized.type === 'radial' ? TUNING.gradientSize : 1;
      const ctx = canvas.getContext('2d')!;
      const ramp =
        normalized.type === 'radial'
          ? ctx.createRadialGradient(
              (normalized.center!.x + 1) * (TUNING.gradientSize / 2),
              (normalized.center!.y + 1) * (TUNING.gradientSize / 2),
              normalized.innerRadius! * (TUNING.gradientSize / 2),
              TUNING.gradientSize / 2,
              TUNING.gradientSize / 2,
              TUNING.gradientSize / 2,
            )
          : ctx.createLinearGradient(0, 0, TUNING.gradientSize, 0);

      for (const stop of normalized.colorStops!) {
        ramp.addColorStop(stop.offset, new Color(stop.color).toRgbaString());
      }

      ctx.fillStyle = ramp;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const texture = Texture.from(canvas, true);
      texture.source.addressMode = 'clamp-to-edge';
      entry = { texture, used: frame };
      this.entries.set(key, entry);
    }

    entry.used = frame;

    return { texture: entry.texture, matrix, textureSpace: 'global' };
  }

  trim(frame: number) {
    for (const [key, entry] of this.entries) {
      if (frame - entry.used > TUNING.gradientIdleFrames) {
        entry.texture.destroy(true);
        this.entries.delete(key);
      }
    }
  }

  destroy() {
    this.colors.clear();

    for (const entry of this.entries.values()) {
      entry.texture.destroy(true);
    }

    this.entries.clear();
  }
}
