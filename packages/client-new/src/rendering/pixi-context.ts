import {
  autoDetectRenderer,
  Container,
  Sprite,
  Graphics,
  Texture,
  Rectangle,
  Matrix,
  Text,
  Color,
  BlurFilter,
} from "pixi.js";
import type { Renderer, GradientOptions, LinearGradientOptions } from "pixi.js";
import "./soft-light";
import { World } from "miniplex";

type Paint = string | Gradient;
type PathCommand = {
  method:
    | "moveTo"
    | "lineTo"
    | "quadraticCurveTo"
    | "bezierCurveTo"
    | "arc"
    | "ellipse"
    | "closePath";
  args: number[];
};
type State = {
  matrix: Matrix;
  fillStyle: Paint;
  strokeStyle: Paint;
  globalAlpha: number;
  globalCompositeOperation: string;
  lineWidth: number;
  lineJoin: CanvasLineJoin;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  shadowBlur: number;
  shadowColor: string;
  shadowOffsetY: number;
  mask: Graphics | null;
  dash: number[];
};
type Visual = {
  object: Container;
  kind: "sprite" | "graphics" | "text";
  active: boolean;
  blur?: BlurFilter;
  styleKey?: string;
  frameTexture?: Texture;
};
class Gradient {
  options: GradientOptions;
  constructor(options: GradientOptions) {
    this.options = options;
  }
  addColorStop(offset: number, color: string) {
    (this.options.colorStops ??= []).push({ offset, color });
  }
}

/** Drawing command adapter: images become batched GPU sprites, paths become GPU
 * geometry. Canvas is used only by asset baking and text metrics, never a world-frame upload.
 */
export class PixiContext {
  readonly canvas: HTMLCanvasElement;
  readonly ecs = new World<Visual>();
  private stage = new Container();
  private renderer?: Renderer;
  private disposed = false;
  private width = 1;
  private height = 1;
  readonly ready: Promise<void>;
  private pools: Record<Visual["kind"], Visual[]> = { sprite: [], graphics: [], text: [] };
  private cursors = { sprite: 0, graphics: 0, text: 0 };
  private childCursors = new Map<Container, number>();
  private colors = new Map<string, Color>();
  private drawMatrix = new Matrix();
  private sources = new Map<CanvasImageSource, { texture: Texture; used: number }>();
  private gradients = new Map<string, { texture: Texture; used: number }>();
  private frame = 0;
  private shadowPass = false;
  private shadowStrength = 0;
  private shadowRects = new Map<string, HTMLCanvasElement>();
  private maskGroups: Container[] = [];
  private maskCursor = 0;
  private currentMask: Graphics | null = null;
  private currentGroup?: Container;
  private stack: State[] = [];
  private stackDepth = 0;
  private path: PathCommand[] = [];
  private metrics = document.createElement("canvas").getContext("2d")!;
  private state: State = this.defaults();
  imageSmoothingEnabled = false;
  private defaults(): State {
    return {
      matrix: new Matrix(),
      fillStyle: "#000",
      strokeStyle: "#000",
      globalAlpha: 1,
      globalCompositeOperation: "source-over",
      lineWidth: 1,
      lineJoin: "miter",
      font: "10px sans-serif",
      textAlign: "start",
      textBaseline: "alphabetic",
      shadowBlur: 0,
      shadowColor: "transparent",
      shadowOffsetY: 0,
      mask: null,
      dash: [],
    };
  }
  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.stage.eventMode = "none";
    this.ready = autoDetectRenderer({
      canvas,
      preference: ["webgl"],
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
        renderer.resize(this.width, this.height);
        this.canvas.dataset.renderer = "pixijs-webgl";
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
    this.childCursors.clear();
    this.childCursors.set(this.stage, 0);
    // Release previous clip ownership before pooled graphics take new roles.
    for (const group of this.maskGroups) group.mask = null;
    this.maskCursor = 0;
    this.currentMask = null;
    this.currentGroup = undefined;
    this.cursors = { sprite: 0, graphics: 0, text: 0 };
    this.state = this.defaults();
    this.stackDepth = 0;
    this.path.length = 0;
  }
  present() {
    if (!this.renderer) return;
    for (const [parent, count] of this.childCursors)
      if (parent.children.length > count) parent.removeChildren(count);
    if (this.renderer.width !== this.canvas.width || this.renderer.height !== this.canvas.height)
      this.renderer.resize(this.canvas.width, this.canvas.height);
    this.renderer.render(this.stage);
    if (this.frame === 1 || this.frame % 60 === 0)
      this.canvas.dataset.renderStats = JSON.stringify(this.stats());
    if (this.frame % 120 === 0) {
      for (const [key, entry] of this.gradients)
        if (this.frame - entry.used > 120) {
          entry.texture.destroy(true);
          this.gradients.delete(key);
        }
      for (const [key, entry] of this.sources)
        if (this.frame - entry.used > 600) {
          entry.texture.destroy(true);
          this.sources.delete(key);
        }
      for (const kind of ["sprite", "graphics", "text"] as const) {
        const pool = this.pools[kind];
        const keep = Math.max(this.cursors[kind] + 32, Math.ceil(pool.length * 0.75));
        while (pool.length > keep) {
          const entry = pool.pop()!;
          this.ecs.remove(entry);
          entry.frameTexture?.destroy();
          entry.blur?.destroy();
          entry.object.destroy();
        }
      }
    }
  }
  stats() {
    return {
      renderer: "pixijs-webgl",
      visuals: this.ecs.size,
      textures: this.sources.size,
      gradients: this.gradients.size,
      active: { ...this.cursors },
    };
  }
  destroy() {
    this.disposed = true;
    for (const entry of this.ecs) {
      entry.frameTexture?.destroy();
      entry.blur?.destroy();
      entry.object.destroy();
    }
    for (const entry of this.sources.values()) {
      entry.texture.destroy(true);
    }
    for (const entry of this.gradients.values()) entry.texture.destroy(true);
    for (const group of this.maskGroups) group.destroy();
    this.shadowRects.clear();
    this.renderer?.destroy();
    this.stage.destroy();
    this.sources.clear();
    this.gradients.clear();
    this.colors.clear();
    this.childCursors.clear();
  }
  private visual(kind: Visual["kind"]): Visual {
    const index = this.cursors[kind]++;
    let entity = this.pools[kind][index];
    if (!entity) {
      const object =
        kind === "sprite"
          ? new Sprite()
          : kind === "graphics"
            ? new Graphics()
            : new Text({ text: "", resolution: 4, textureStyle: { scaleMode: "nearest" } });
      object.eventMode = "none";
      entity = this.ecs.add({ object, kind, active: true });
      this.pools[kind].push(entity);
    }
    const object = entity.object;
    entity.active = true;
    object.visible = true;
    object.alpha = this.state.globalAlpha;
    // Sprites and text receive their final transform at the draw call below.
    if (kind === "graphics") object.setFromMatrix(this.state.matrix);
    object.blendMode =
      (
        {
          "source-over": "normal",
          lighter: "add",
          screen: "screen",
          multiply: "multiply",
          "soft-light": "soft-light",
        } as const
      )[this.state.globalCompositeOperation as "source-over"] ?? "normal";
    object.mask = null;
    if (this.shadowPass && this.shadowStrength > 0) {
      entity.blur ??= new BlurFilter({ quality: 2, resolution: 0.5 });
      entity.blur.strength = this.shadowStrength;
      if (object.filters?.[0] !== entity.blur) object.filters = [entity.blur];
    } else if (object.filters?.length) object.filters = null;
    if (this.state.mask) {
      // One clip for a contiguous group, not one stencil pass for every portal
      // pixel or particle. Children remain eligible for normal sprite batching.
      if (this.currentMask !== this.state.mask || !this.currentGroup) {
        const group = (this.maskGroups[this.maskCursor] ??= new Container());
        this.maskCursor++;
        group.mask = this.state.mask;
        this.place(this.stage, group);
        this.childCursors.set(group, 0);
        this.currentMask = this.state.mask;
        this.currentGroup = group;
      }
      this.place(this.currentGroup, object);
    } else {
      this.currentMask = null;
      this.currentGroup = undefined;
      this.place(this.stage, object);
    }
    return entity;
  }
  private place(parent: Container, object: Container) {
    const index = this.childCursors.get(parent) ?? 0;
    if (parent.children[index] !== object) parent.addChildAt(object, index);
    this.childCursors.set(parent, index + 1);
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
      typeof this.state.fillStyle === "string" ? this.color(this.state.fillStyle).alpha : 1;
    const key = `${width}:${height}:${blur}:${opacity}:${this.state.shadowColor}`;
    let canvas = this.shadowRects.get(key);
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.width = Math.ceil(Math.abs(width) + padding * 2);
      canvas.height = Math.ceil(Math.abs(height) + padding * 2);
      const ctx = canvas.getContext("2d")!;
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
    this.state.shadowColor = "#ffffff";
    this.drawImage(
      canvas,
      Math.min(x, x + width) - padding,
      Math.min(y, y + height) - padding + this.state.shadowOffsetY,
    );
    this.shadowPass = false;
    this.restore();
  }
  private paint(
    value: Paint,
  ): string | { texture: Texture; matrix: Matrix; textureSpace: "global" } {
    if (typeof value === "string") return value;
    const options = value.options;
    // Texture ramps depend on color stops and relative shape, not world position.
    // Moving the camera or a light only changes its matrix, never allocates a ramp.
    let normalized: GradientOptions;
    let matrix: Matrix;
    if (options.type === "radial") {
      const outer = options.outerCenter!,
        center = options.center!,
        radius = Math.max(0.0001, options.outerRadius!);
      normalized = {
        type: "radial",
        textureSpace: "global",
        center: { x: (center.x - outer.x) / radius, y: (center.y - outer.y) / radius },
        outerCenter: { x: 0, y: 0 },
        innerRadius: options.innerRadius! / radius,
        outerRadius: 1,
        colorStops: options.colorStops,
      };
      matrix = new Matrix(
        (radius * 2) / 256,
        0,
        0,
        (radius * 2) / 256,
        outer.x - radius,
        outer.y - radius,
      );
    } else {
      const linear = options as LinearGradientOptions;
      const start = linear.start!,
        end = linear.end!,
        dx = end.x - start.x,
        dy = end.y - start.y;
      const distance = Math.max(0.0001, Math.hypot(dx, dy));
      normalized = {
        type: "linear",
        textureSpace: "global",
        start: { x: 0, y: 0 },
        end: { x: 1, y: 0 },
        colorStops: options.colorStops,
      };
      matrix = new Matrix(dx / 256, dy / 256, -dy / distance, dx / distance, start.x, start.y);
    }
    const key = JSON.stringify(normalized);
    let entry = this.gradients.get(key);
    if (!entry) {
      // Bake only the reusable ramp, on a transparent surface. FillGradient's
      // radial builder pre-fills the outer stop, making transparent centers opaque.
      const canvas = document.createElement("canvas");
      canvas.width = 256;
      canvas.height = normalized.type === "radial" ? 256 : 1;
      const ctx = canvas.getContext("2d")!;
      const ramp =
        normalized.type === "radial"
          ? ctx.createRadialGradient(
              (normalized.center!.x + 1) * 128,
              (normalized.center!.y + 1) * 128,
              normalized.innerRadius! * 128,
              128,
              128,
              128,
            )
          : ctx.createLinearGradient(0, 0, 256, 0);
      for (const stop of normalized.colorStops!) ramp.addColorStop(stop.offset, String(stop.color));
      ctx.fillStyle = ramp;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      const texture = Texture.from(canvas, true);
      texture.source.addressMode = "clamp-to-edge";
      entry = { texture, used: this.frame };
      this.gradients.set(key, entry);
    }
    entry.used = this.frame;
    return { texture: entry.texture, matrix, textureSpace: "global" };
  }
  private strokePaint() {
    const paint = this.paint(this.state.strokeStyle);
    return typeof paint === "string" ? { color: paint } : paint;
  }
  private geometry(): Graphics {
    const graphics = this.visual("graphics").object as Graphics;
    graphics.clear();
    let penX = 0,
      penY = 0,
      dashAt = 0;
    const dash = this.state.dash.filter((n) => n > 0);
    for (const { method, args } of this.path) {
      if (method === "ellipse") {
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
      } else if (method === "arc")
        graphics.arc(args[0], args[1], args[2], args[3], args[4], !!args[5]);
      else if (method === "moveTo") {
        graphics.moveTo(args[0], args[1]);
        penX = args[0];
        penY = args[1];
        dashAt = 0;
      } else if (method === "lineTo") {
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
      } else if (method === "quadraticCurveTo")
        graphics.quadraticCurveTo(args[0], args[1], args[2], args[3]);
      else if (method === "bezierCurveTo")
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
        const raster = document.createElement("canvas");
        raster.width = iw;
        raster.height = ih;
        raster.getContext("2d")!.drawImage(image, 0, 0, iw, ih);
        resource = raster;
      }
      const texture = Texture.from(resource, true);
      texture.source.scaleMode = "nearest";
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
    const entity = this.visual("sprite");
    const sprite = entity.object as Sprite;
    let texture = entity.frameTexture;
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
    const tint = this.color(this.shadowPass ? this.state.shadowColor : "#ffffff");
    sprite.tint = tint.toNumber();
    sprite.alpha *= tint.alpha;
    this.applyTransform(sprite, dx, dy, dw / sw, dh / sh);
  }
  fillRect(x: number, y: number, width: number, height: number) {
    this.rectangleShadow(x, y, width, height);
    if (typeof this.state.fillStyle !== "string") {
      const g = this.visual("graphics").object as Graphics;
      g.clear().rect(x, y, width, height).fill(this.paint(this.state.fillStyle));
      return;
    }
    const sprite = this.visual("sprite").object as Sprite;
    const color = this.color(this.state.fillStyle);
    sprite.texture = Texture.WHITE;
    sprite.tint = color.toNumber();
    sprite.alpha = this.state.globalAlpha * color.alpha;
    this.applyTransform(sprite, x, y, width, height);
  }
  strokeRect(x: number, y: number, width: number, height: number) {
    this.shadow(() => this.strokeRect(x, y, width, height));
    const g = this.visual("graphics").object as Graphics;
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
    this.path.push({ method: "closePath", args: [] });
  }
  moveTo(...args: number[]) {
    this.path.push({ method: "moveTo", args });
  }
  lineTo(...args: number[]) {
    this.path.push({ method: "lineTo", args });
  }
  quadraticCurveTo(...args: number[]) {
    this.path.push({ method: "quadraticCurveTo", args });
  }
  bezierCurveTo(...args: number[]) {
    this.path.push({ method: "bezierCurveTo", args });
  }
  arc(x: number, y: number, r: number, start: number, end: number, ccw = false) {
    this.path.push({ method: "arc", args: [x, y, r, start, end, Number(ccw)] });
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
    this.path.push({ method: "ellipse", args: [x, y, rx, ry, rotation, start, end, Number(ccw)] });
  }
  fill() {
    this.shadow(() => this.fill());
    this.geometry().fill(this.paint(this.state.fillStyle));
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
  save() {
    const saved = (this.stack[this.stackDepth++] ??= this.defaults());
    this.copyState(saved, this.state);
  }
  restore() {
    if (this.stackDepth) this.copyState(this.state, this.stack[--this.stackDepth]);
  }
  private copyState(target: State, source: State) {
    const matrix = target.matrix;
    Object.assign(target, source);
    target.matrix = matrix.copyFrom(source.matrix);
  }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.state.matrix.set(a, b, c, d, e, f);
  }
  resetTransform() {
    this.state.matrix.identity();
  }
  getTransform() {
    const m = this.state.matrix;
    return new DOMMatrix([m.a, m.b, m.c, m.d, m.tx, m.ty]);
  }
  transform(a: number, b: number, c: number, d: number, e: number, f: number) {
    this.state.matrix.append(this.drawMatrix.set(a, b, c, d, e, f));
  }
  translate(x: number, y: number) {
    this.transform(1, 0, 0, 1, x, y);
  }
  scale(x: number, y: number) {
    this.transform(x, 0, 0, y, 0, 0);
  }
  rotate(angle: number) {
    this.transform(Math.cos(angle), Math.sin(angle), -Math.sin(angle), Math.cos(angle), 0, 0);
  }
  setLineDash(values: number[]) {
    this.state.dash = [...values];
  }
  createLinearGradient(x0: number, y0: number, x1: number, y1: number) {
    return new Gradient({
      type: "linear",
      textureSpace: "global",
      start: { x: x0, y: y0 },
      end: { x: x1, y: y1 },
    });
  }
  createRadialGradient(x0: number, y0: number, r0: number, x1: number, y1: number, r1: number) {
    return new Gradient({
      type: "radial",
      textureSpace: "global",
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
    const entity = this.visual("text"),
      text = entity.object as Text;
    const match = this.state.font.match(/(?:(bold|[1-9]00)\s+)?([\d.]+)px\s+(.+)/);
    const style = {
      fontFamily: match?.[3] ?? "sans-serif",
      fontSize: Number(match?.[2] ?? 10),
      fontWeight: (match?.[1] ?? "normal") as "normal" | "bold",
      fill: stroke ? "transparent" : this.paint(this.state.fillStyle),
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
      this.state.textAlign === "center"
        ? 0.5
        : ["right", "end"].includes(this.state.textAlign)
          ? 1
          : 0,
      this.state.textBaseline === "middle"
        ? 0.5
        : ["top", "hanging"].includes(this.state.textBaseline)
          ? 0
          : this.state.textBaseline === "alphabetic"
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
  get fillStyle() {
    return this.state.fillStyle;
  }
  set fillStyle(v: Paint) {
    this.state.fillStyle = v;
  }
  get strokeStyle() {
    return this.state.strokeStyle;
  }
  set strokeStyle(v: Paint) {
    this.state.strokeStyle = v;
  }
  get globalAlpha() {
    return this.state.globalAlpha;
  }
  set globalAlpha(v: number) {
    this.state.globalAlpha = v;
  }
  get globalCompositeOperation() {
    return this.state.globalCompositeOperation;
  }
  set globalCompositeOperation(v: string) {
    this.state.globalCompositeOperation = v;
  }
  get lineWidth() {
    return this.state.lineWidth;
  }
  set lineWidth(v: number) {
    this.state.lineWidth = v;
  }
  get lineJoin() {
    return this.state.lineJoin;
  }
  set lineJoin(v: CanvasLineJoin) {
    this.state.lineJoin = v;
  }
  get font() {
    return this.state.font;
  }
  set font(v: string) {
    this.state.font = v;
  }
  get textAlign() {
    return this.state.textAlign;
  }
  set textAlign(v: CanvasTextAlign) {
    this.state.textAlign = v;
  }
  get textBaseline() {
    return this.state.textBaseline;
  }
  set textBaseline(v: CanvasTextBaseline) {
    this.state.textBaseline = v;
  }
  get shadowBlur() {
    return this.state.shadowBlur;
  }
  set shadowBlur(v: number) {
    this.state.shadowBlur = v;
  }
  get shadowColor() {
    return this.state.shadowColor;
  }
  set shadowColor(v: string) {
    this.state.shadowColor = v;
  }
  get shadowOffsetY() {
    return this.state.shadowOffsetY;
  }
  set shadowOffsetY(v: number) {
    this.state.shadowOffsetY = v;
  }
}
