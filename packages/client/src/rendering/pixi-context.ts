import { DrawingState } from './drawing-state';
import { VisualPools, type Visual } from './visual-pools';
import { Gradient, GradientPaints } from './paints';
import {
  autoDetectRenderer,
  Container,
  Sprite,
  Graphics,
  Texture,
  Rectangle,
  Text,
  Color,
} from 'pixi.js';
import type { BindGroup, Renderer } from 'pixi.js';
import './soft-light';
import { playerCutoutRuns, PLAYER_CUTOUT_MARGIN } from './player-cutout';
import type { DirectionalShadow } from '../lighting';

type PathCommand = {
  method:
    | 'moveTo'
    | 'lineTo'
    | 'quadraticCurveTo'
    | 'bezierCurveTo'
    | 'arc'
    | 'ellipse'
    | 'closePath';
  args: number[];
};

/** Drawing command adapter: images become batched GPU sprites, paths become GPU
 * geometry. Canvas is used only by asset baking and text metrics, never a world-frame upload.
 */
export class PixiContext extends DrawingState {
  private visuals = new VisualPools();
  get ecs() {
    return this.visuals.ecs;
  }
  ambientTint = 0xffffff;
  directionalShadow?: DirectionalShadow;
  readonly canvas: HTMLCanvasElement;
  private cutout = new Graphics();
  private cutoutRuns?: ReturnType<typeof playerCutoutRuns>;
  private hasCutout = false;
  private cutoutBounds = new Rectangle();
  private spriteBounds = new Rectangle();
  private renderer?: Renderer;
  private disposed = false;
  private width = 1;
  private height = 1;
  readonly ready: Promise<void>;
  private colors = new Map<string, Color>();
  private sources = new Map<CanvasImageSource, { texture: Texture; used: number }>();
  private gradients = new GradientPaints();
  private frame = 0;
  private shadowPass = false;
  private shadowStrength = 0;
  private shadowRects = new Map<string, HTMLCanvasElement>();
  private path: PathCommand[] = [];
  private metrics = document.createElement('canvas').getContext('2d')!;
  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.ready = autoDetectRenderer({
      canvas,
      preference: ['webgl'],
      // Soft-light grading needs the scene behind it; without this Pixi skips
      // the blend filter and paints a flat translucent wash over the world.
      useBackBuffer: true,
      antialias: false,
      backgroundAlpha: 1,
      resolution: 1,
      width: 1,
      height: 1,
    }).then((renderer) => {
      if (this.disposed) renderer.destroy();
      else {
        this.renderer = renderer;
        // Arena owns native cursor feedback. Pixi's default inline `inherit`
        // would otherwise override the canvas's data-cursor stylesheet rules.
        renderer.events.cursorStyles.default = () => canvas.style.removeProperty('cursor');
        canvas.style.removeProperty('cursor');
        renderer.resize(this.width, this.height);
        this.canvas.dataset.renderer = 'pixijs-webgl';
      }
    });
  }
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.renderer?.resize(width, height);
  }
  get initialized() {
    return !!this.renderer;
  }
  begin() {
    this.frame++;
    this.hasCutout = false;
    this.visuals.begin();
    this.resetState();
    this.path.length = 0;
  }
  present() {
    if (!this.renderer) return;
    // Clearing a pooled object's last mask reference can restore includeInBuild.
    // The cutout is only stencil geometry, never a visible stage child.
    this.cutout.includeInBuild = false;
    this.visuals.finish();
    if (this.renderer.width !== this.canvas.width || this.renderer.height !== this.canvas.height)
      this.renderer.resize(this.canvas.width, this.canvas.height);
    try {
      this.renderer.render(this.visuals.stage);
    } finally {
      // Pixi 8.22 keeps its last filter input, sampler and backdrop bound even
      // after returning them to TexturePool. Resizing or disposing the view
      // prunes those textures. Release the bindings before that can happen.
      // This version-specific access can go once FilterSystem does this itself.
      const { _globalFilterBindGroup: group } = this.renderer.filter as unknown as {
        _globalFilterBindGroup: BindGroup;
      };
      group.setResource(Texture.EMPTY.source, 1);
      group.setResource(Texture.EMPTY.source.style, 2);
      group.setResource(Texture.EMPTY.source, 3);
    }
    if (this.frame === 1 || this.frame % 60 === 0)
      this.canvas.dataset.renderStats = JSON.stringify(this.stats());
    if (this.frame % 120 === 0) {
      this.gradients.trim(this.frame);
      for (const [key, entry] of this.sources)
        if (this.frame - entry.used > 600) {
          entry.texture.destroy(true);
          this.sources.delete(key);
        }
      this.visuals.trim();
    }
  }
  stats() {
    return {
      renderer: 'pixijs-webgl',
      visuals: this.ecs.size,
      textures: this.sources.size,
      gradients: this.gradients.size,
      text: { fontFamily: this.fontFamily, scaleMode: 'linear', resolution: 4 },
      active: this.visuals.active,
    };
  }
  destroy() {
    this.disposed = true;
    this.visuals.destroy();
    for (const entry of this.sources.values()) {
      entry.texture.destroy(true);
    }
    this.gradients.destroy();
    this.cutout.destroy();
    this.shadowRects.clear();
    this.renderer?.destroy();
    this.sources.clear();
    this.colors.clear();
  }
  /** Configure once before the depth-sorted bodies, using their world transform. */
  setPlayerCutout(mask: HTMLCanvasElement, x: number, y: number, width: number, height: number) {
    const runs = playerCutoutRuns(mask, width, height);
    if (runs !== this.cutoutRuns) {
      this.cutout.clear();
      for (const [x, y, width] of runs) this.cutout.rect(x, y, width, 1);
      this.cutout.fill(0xffffff);
      this.cutoutRuns = runs;
    }
    this.hasCutout = runs.length > 0;
    this.cutout.includeInBuild = false;
    this.visuals.place(this.visuals.stage, this.cutout);
    this.applyTransform(this.cutout, x - PLAYER_CUTOUT_MARGIN, y - PLAYER_CUTOUT_MARGIN);
    this.transformedBounds(
      this.cutoutBounds,
      x - PLAYER_CUTOUT_MARGIN,
      y - PLAYER_CUTOUT_MARGIN,
      Math.ceil(width) + 2 * PLAYER_CUTOUT_MARGIN,
      Math.ceil(height) + 2 * PLAYER_CUTOUT_MARGIN,
    );
  }
  private transformedBounds(
    bounds: Rectangle,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const m = this.state.matrix;
    const ax = m.a * width,
      bx = m.c * height,
      ay = m.b * width,
      by = m.d * height;
    bounds.x = m.a * x + m.c * y + m.tx + Math.min(0, ax) + Math.min(0, bx);
    bounds.y = m.b * x + m.d * y + m.ty + Math.min(0, ay) + Math.min(0, by);
    bounds.width = Math.abs(ax) + Math.abs(bx);
    bounds.height = Math.abs(ay) + Math.abs(by);
    return bounds;
  }
  private visual(kind: Visual['kind']) {
    return this.visuals.visual(kind, this.state, this.shadowPass, this.shadowStrength);
  }
  private color(value: string) {
    let color = this.colors.get(value);
    if (!color) {
      color = new Color(value);
      if (this.colors.size >= 512) this.colors.delete(this.colors.keys().next().value!);
      this.colors.set(value, color);
    }
    return color;
  }
  private applyTransform(object: Container, x: number, y: number, sx = 1, sy = 1) {
    const m = this.state.matrix;
    const tx = m.a * x + m.c * y + m.tx;
    const ty = m.b * x + m.d * y + m.ty;
    if (m.b === 0 && m.c === 0 && m.a * sx >= 0 && m.d * sy >= 0) {
      object.position.set(tx, ty);
      object.scale.set(m.a * sx, m.d * sy);
      object.rotation = 0;
      object.skew.set(0, 0);
    } else {
      object.setFromMatrix(this.drawMatrix.set(m.a * sx, m.b * sx, m.c * sy, m.d * sy, tx, ty));
    }
  }
  private shadow(draw: () => void) {
    if (this.shadowPass || this.color(this.state.shadowColor).alpha === 0) return;
    this.save();
    this.shadowPass = true;
    this.shadowStrength = this.state.shadowBlur / 2;
    // Canvas shadow offsets and blur are measured in output pixels.
    this.state.matrix.ty += this.state.shadowOffsetY;
    this.state.fillStyle = this.state.strokeStyle = this.state.shadowColor;
    try {
      draw();
    } finally {
      this.shadowPass = false;
      this.restore();
    }
  }
  private rectangleShadow(x: number, y: number, width: number, height: number) {
    if (this.shadowPass || this.color(this.state.shadowColor).alpha === 0) return;
    const blur = this.state.shadowBlur,
      padding = Math.ceil(blur * 3 + 2);
    const opacity =
      typeof this.state.fillStyle === 'string' ? this.color(this.state.fillStyle).alpha : 1;
    const key = `${width}:${height}:${blur}:${opacity}:${this.state.shadowColor}`;
    let canvas = this.shadowRects.get(key);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = Math.ceil(Math.abs(width) + padding * 2);
      canvas.height = Math.ceil(Math.abs(height) + padding * 2);
      const ctx = canvas.getContext('2d')!;
      // Bake a reusable glow primitive. The solid source is moved outside the
      // image so only its shadow remains; no per-particle GPU filter passes.
      ctx.shadowBlur = blur;
      ctx.shadowColor = this.state.shadowColor;
      ctx.shadowOffsetX = canvas.width * 2;
      ctx.globalAlpha = opacity;
      ctx.fillRect(padding - canvas.width * 2, padding, Math.abs(width), Math.abs(height));
      if (this.shadowRects.size >= 128)
        this.shadowRects.delete(this.shadowRects.keys().next().value!);
      this.shadowRects.set(key, canvas);
    }
    this.save();
    this.shadowPass = true;
    this.shadowStrength = 0;
    this.state.shadowColor = '#ffffff';
    this.drawImage(
      canvas,
      Math.min(x, x + width) - padding,
      Math.min(y, y + height) - padding + this.state.shadowOffsetY,
    );
    this.shadowPass = false;
    this.restore();
  }
  private strokePaint() {
    const paint = this.gradients.paint(this.state.strokeStyle, this.frame);
    return typeof paint === 'string' ? { color: paint } : paint;
  }
  private geometry(): Graphics {
    const graphics = this.visual('graphics').object as Graphics;
    graphics.clear();
    let penX = 0,
      penY = 0,
      dashAt = 0;
    const dash = this.state.dash.filter((n) => n > 0);
    for (const { method, args } of this.path) {
      if (method === 'ellipse') {
        const [x, y, rx, ry, rotation, start, end, ccw] = args;
        // Flatten rotated/partial ellipses into a short polygon in local coordinates.
        const sweep = ccw
          ? -((start - end + Math.PI * 2) % (Math.PI * 2) || Math.PI * 2)
          : (end - start) % (Math.PI * 2) || Math.PI * 2;
        const count = Math.max(12, Math.ceil((Math.abs(sweep) * Math.max(rx, ry)) / 4));
        for (let i = 0; i <= count; i++) {
          const angle = start + (sweep * i) / count;
          const px = Math.cos(angle) * rx,
            py = Math.sin(angle) * ry;
          const tx = x + px * Math.cos(rotation) - py * Math.sin(rotation),
            ty = y + px * Math.sin(rotation) + py * Math.cos(rotation);
          if (i === 0) graphics.moveTo(tx, ty);
          else graphics.lineTo(tx, ty);
        }
      } else if (method === 'arc')
        graphics.arc(args[0], args[1], args[2], args[3], args[4], !!args[5]);
      else if (method === 'moveTo') {
        graphics.moveTo(args[0], args[1]);
        penX = args[0];
        penY = args[1];
        dashAt = 0;
      } else if (method === 'lineTo') {
        if (dash.length) {
          const dx = args[0] - penX,
            dy = args[1] - penY,
            length = Math.hypot(dx, dy);
          const cycle = dash.reduce((sum, n) => sum + n, 0);
          for (let at = 0; at < length;) {
            let offset = dashAt % cycle,
              index = 0;
            while (offset >= dash[index]) {
              offset -= dash[index];
              index++;
            }
            const step = Math.min(length - at, dash[index] - offset);
            at += step;
            dashAt += step;
            const x = penX + (dx * at) / length,
              y = penY + (dy * at) / length;
            if (index % 2 === 0) graphics.lineTo(x, y);
            else graphics.moveTo(x, y);
          }
        } else graphics.lineTo(args[0], args[1]);
        penX = args[0];
        penY = args[1];
      } else if (method === 'quadraticCurveTo')
        graphics.quadraticCurveTo(args[0], args[1], args[2], args[3]);
      else if (method === 'bezierCurveTo')
        graphics.bezierCurveTo(args[0], args[1], args[2], args[3], args[4], args[5]);
      else graphics.closePath();
    }
    return graphics;
  }
  drawImage(source: CanvasImageSource, ...args: number[]) {
    this.shadow(() => this.drawImage(source, ...args));
    const image = source as HTMLImageElement | HTMLCanvasElement;
    const iw = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
    const ih = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
    if (!iw || !ih) return;
    let sx = 0,
      sy = 0,
      sw = iw,
      sh = ih,
      dx = 0,
      dy = 0,
      dw = iw,
      dh = ih;
    if (args.length === 2) [dx, dy] = args;
    else if (args.length === 4) [dx, dy, dw, dh] = args;
    else [sx, sy, sw, sh, dx, dy, dw, dh] = args;
    // Atlas callers use game-pixel cells; the backing art retains twice the detail.
    if (args.length === 8 && image instanceof HTMLImageElement) {
      const resolution = Number(image.dataset.artResolution ?? 1);
      sx *= resolution;
      sy *= resolution;
      sw *= resolution;
      sh *= resolution;
    }
    if (!sw || !sh || !dw || !dh) return;
    let entry = this.sources.get(source);
    if (!entry) {
      // WebGL uploads of SVG images without explicit dimensions can produce an
      // empty texture. Rasterize once at the decoded size, keeping the SVG asset
      // and the normal source-texture cache shared by all status sprites.
      let resource: HTMLImageElement | HTMLCanvasElement = image;
      if (
        image instanceof HTMLImageElement &&
        /\.svg(?:[?#]|$)|^data:image\/svg\+xml/i.test(image.currentSrc || image.src)
      ) {
        const raster = document.createElement('canvas');
        raster.width = iw;
        raster.height = ih;
        raster.getContext('2d')!.drawImage(image, 0, 0, iw, ih);
        resource = raster;
      }
      const texture = Texture.from(resource, true);
      texture.source.scaleMode = 'nearest';
      entry = { texture, used: this.frame };
      this.sources.set(source, entry);
    }
    // Dynamic light canvases explicitly mark their revision when repainted.
    const revision = (image as HTMLCanvasElement & { textureRevision?: number }).textureRevision;
    const textureRevision = (entry as typeof entry & { revision?: number }).revision;
    if (revision !== undefined && revision !== textureRevision) {
      entry.texture.source.update();
      (entry as typeof entry & { revision?: number }).revision = revision;
    }
    entry.used = this.frame;
    const entity = this.visual('sprite');
    const sprite = entity.object as Sprite;
    let texture = entity.frameTexture;
    const scaleMode = this.imageSmoothingEnabled ? 'linear' : 'nearest';
    if (entry.texture.source.scaleMode !== scaleMode) {
      entry.texture.source.scaleMode = scaleMode;
      entry.texture.source.style.update();
    }
    if (!texture)
      texture = entity.frameTexture = new Texture({
        source: entry.texture.source,
        frame: new Rectangle(sx, sy, sw, sh),
        dynamic: true,
      });
    else if (
      texture.source !== entry.texture.source ||
      texture.frame.x !== sx ||
      texture.frame.y !== sy ||
      texture.frame.width !== sw ||
      texture.frame.height !== sh
    ) {
      texture.source = entry.texture.source;
      texture.frame.copyFrom(new Rectangle(sx, sy, sw, sh));
      texture.orig.width = sw;
      texture.orig.height = sh;
      texture.update();
    }
    sprite.texture = texture;
    const tint = this.color(this.shadowPass ? this.state.shadowColor : this.state.spriteTint);
    const base = tint.toNumber();
    const ambient =
      this.shadowPass || this.state.globalCompositeOperation !== 'source-over'
        ? 0xffffff
        : this.ambientTint;
    sprite.tint =
      (Math.round((((base >> 16) & 255) * ((ambient >> 16) & 255)) / 255) << 16) |
      (Math.round((((base >> 8) & 255) * ((ambient >> 8) & 255)) / 255) << 8) |
      Math.round(((base & 255) * (ambient & 255)) / 255);
    sprite.alpha *= tint.alpha;
    this.applyTransform(sprite, dx, dy, dw / sw, dh / sh);
    if (
      this.state.occlusion &&
      this.hasCutout &&
      !this.shadowPass &&
      this.cutoutBounds.intersects(this.transformedBounds(this.spriteBounds, dx, dy, dw, dh))
    )
      sprite.setMask({ mask: this.cutout, inverse: true });
  }
  fillRect(x: number, y: number, width: number, height: number) {
    this.rectangleShadow(x, y, width, height);
    if (typeof this.state.fillStyle !== 'string') {
      const g = this.visual('graphics').object as Graphics;
      g.clear()
        .rect(x, y, width, height)
        .fill(this.gradients.paint(this.state.fillStyle, this.frame));
      return;
    }
    const sprite = this.visual('sprite').object as Sprite;
    const color = this.color(this.state.fillStyle);
    sprite.texture = Texture.WHITE;
    sprite.tint = color.toNumber();
    sprite.alpha = this.state.globalAlpha * color.alpha;
    this.applyTransform(sprite, x, y, width, height);
  }
  strokeRect(x: number, y: number, width: number, height: number) {
    this.shadow(() => this.strokeRect(x, y, width, height));
    const g = this.visual('graphics').object as Graphics;
    g.clear()
      .rect(x, y, width, height)
      .stroke({ ...this.strokePaint(), width: this.state.lineWidth });
  }
  clearRect() {
    this.begin();
  }
  beginPath() {
    this.path = [];
  }
  closePath() {
    this.path.push({ method: 'closePath', args: [] });
  }
  moveTo(...args: number[]) {
    this.path.push({ method: 'moveTo', args });
  }
  lineTo(...args: number[]) {
    this.path.push({ method: 'lineTo', args });
  }
  quadraticCurveTo(...args: number[]) {
    this.path.push({ method: 'quadraticCurveTo', args });
  }
  bezierCurveTo(...args: number[]) {
    this.path.push({ method: 'bezierCurveTo', args });
  }
  arc(x: number, y: number, r: number, start: number, end: number, ccw = false) {
    this.path.push({ method: 'arc', args: [x, y, r, start, end, Number(ccw)] });
  }
  ellipse(
    x: number,
    y: number,
    rx: number,
    ry: number,
    rotation: number,
    start: number,
    end: number,
    ccw = false,
  ) {
    this.path.push({ method: 'ellipse', args: [x, y, rx, ry, rotation, start, end, Number(ccw)] });
  }
  fill() {
    this.shadow(() => this.fill());
    this.geometry().fill(this.gradients.paint(this.state.fillStyle, this.frame));
  }
  stroke() {
    this.shadow(() => this.stroke());
    this.geometry().stroke({
      ...this.strokePaint(),
      width: this.state.lineWidth,
      join: this.state.lineJoin,
    });
  }
  clip() {
    const mask = this.geometry().fill(0xffffff);
    this.state.mask = mask;
  }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return new Gradient({
      type: 'linear',
      textureSpace: 'global',
      start: { x: x0, y: y0 },
      end: { x: x1, y: y1 },
    });
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new Gradient({
      type: 'radial',
      textureSpace: 'global',
      center: { x: x0, y: y0 },
      innerRadius: r0,
      outerCenter: { x: x1, y: y1 },
      outerRadius: r1,
    });
  }
  measureText(value: string) {
    this.metrics.font = this.state.font;
    return this.metrics.measureText(value);
  }
  private text(value: string, x: number, y: number, stroke: boolean) {
    this.shadow(() => this.text(value, x, y, stroke));
    const entity = this.visual('text'),
      text = entity.object as Text;
    const match = this.state.font.match(/(?:(bold|[1-9]00)\s+)?([\d.]+)px\s+(.+)/);
    const style = {
      fontFamily: match?.[3] ?? 'sans-serif',
      fontSize: Number(match?.[2] ?? 10),
      fontWeight: (match?.[1] ?? 'normal') as 'normal' | 'bold',
      fill: stroke ? 'transparent' : this.gradients.paint(this.state.fillStyle, this.frame),
      stroke: stroke
        ? { ...this.strokePaint(), width: this.state.lineWidth, join: this.state.lineJoin }
        : undefined,
    };
    const key = JSON.stringify(style);
    if (entity.styleKey !== key) {
      text.style = style;
      entity.styleKey = key;
    }
    if (text.text !== value) text.text = value;
    text.anchor.set(
      this.state.textAlign === 'center'
        ? 0.5
        : ['right', 'end'].includes(this.state.textAlign)
          ? 1
          : 0,
      this.state.textBaseline === 'middle'
        ? 0.5
        : ['top', 'hanging'].includes(this.state.textBaseline)
          ? 0
          : this.state.textBaseline === 'alphabetic'
            ? 0.8
            : 1,
    );
    this.applyTransform(text, x, y);
  }
  fillText(value: string, x: number, y: number) {
    this.text(value, x, y, false);
  }
  strokeText(value: string, x: number, y: number) {
    this.text(value, x, y, true);
  }
}
