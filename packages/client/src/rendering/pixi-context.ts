import { ShadowPrimitives } from './shadow-primitives';
import { updateText } from './drawing-text';
import { PlayerOcclusion } from './player-occlusion';
import { applyTransform } from './drawing-transform';
import { RendererDriver } from './renderer-driver';
import { PathCommands } from './path-commands';
import { ImageTextures } from './image-textures';
import type { WorldDrawingContext } from './drawing-context';
import { VisualPools, type Visual } from './visual-pools';
import { Paints } from './paints';
import { type Container, type Sprite, type Graphics, Texture } from 'pixi.js';
import type { DirectionalShadow } from '../lighting';

/** Drawing command adapter: images become batched GPU sprites, paths become GPU
 * geometry. Canvas is used only by asset baking and text metrics, never a world-frame upload.
 */
export class PixiContext extends PathCommands implements WorldDrawingContext {
  private visuals = new VisualPools();

  get ecs() {
    return this.visuals.ecs;
  }

  ambientTint = 0xffffff;
  directionalShadow?: DirectionalShadow;
  readonly canvas: HTMLCanvasElement;
  private cutout = new PlayerOcclusion((graphics) => {
    return this.visuals.place(this.visuals.stage, graphics);
  });
  private driver: RendererDriver;
  readonly ready: Promise<void>;
  private sources = new ImageTextures();
  private paints = new Paints();
  private frame = 0;
  private shadowPass = false;
  private shadowStrength = 0;
  private shadowRects = new ShadowPrimitives();

  constructor(canvas: HTMLCanvasElement) {
    super();
    this.canvas = canvas;
    this.driver = new RendererDriver(canvas);
    this.ready = this.driver.ready;
  }

  resize(width: number, height: number) {
    this.driver.resize(width, height);
  }

  get initialized() {
    return this.driver.initialized;
  }

  begin() {
    this.frame++;
    this.cutout.begin();
    this.visuals.begin();
    this.resetState();
    this.path.reset();
  }

  present() {
    if (!this.driver.initialized) {
      return;
    }

    // Clearing a pooled object's last mask reference can restore includeInBuild.
    // The cutout is only stencil geometry, never a visible stage child.
    this.cutout.finish();
    this.visuals.finish();
    this.driver.render(this.visuals.stage);
    if (this.frame === 1 || this.frame % 60 === 0) {
      this.canvas.dataset.renderStats = JSON.stringify(this.stats());
    }

    if (this.frame % 120 === 0) {
      this.paints.trim(this.frame);
      this.sources.trim(this.frame);
      this.visuals.trim();
    }
  }

  stats() {
    return {
      renderer: 'pixijs-webgl',
      visuals: this.ecs.size,
      textures: this.sources.size,
      gradients: this.paints.size,
      text: { fontFamily: this.fontFamily, scaleMode: 'linear', resolution: 4 },
      active: this.visuals.active,
    };
  }

  destroy() {
    this.visuals.destroy();
    this.sources.destroy();
    this.paints.destroy();
    this.cutout.destroy();
    this.shadowRects.clear();
    this.driver.destroy();
  }

  /** Configure once before the depth-sorted bodies, using their world transform. */
  setPlayerCutout(mask: HTMLCanvasElement, x: number, y: number, width: number, height: number) {
    this.cutout.configure(mask, x, y, width, height, this.state.matrix);
  }

  private visual(kind: Visual['kind']) {
    return this.visuals.visual(kind, this.state, this.shadowPass, this.shadowStrength);
  }

  private applyTransform(object: Container, x: number, y: number, sx = 1, sy = 1) {
    applyTransform(object, this.state.matrix, this.drawMatrix, x, y, sx, sy);
  }

  private shadow(draw: () => void) {
    if (this.shadowPass || this.paints.color(this.state.shadowColor).alpha === 0) {
      return;
    }

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
    if (this.shadowPass || this.paints.color(this.state.shadowColor).alpha === 0) {
      return;
    }

    const blur = this.state.shadowBlur,
      padding = Math.ceil(blur * 3 + 2);
    const opacity =
      typeof this.state.fillStyle === 'string' ? this.paints.color(this.state.fillStyle).alpha : 1;
    const canvas = this.shadowRects.rectangle(width, height, blur, opacity, this.state.shadowColor);
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
    const paint = this.paints.paint(this.state.strokeStyle, this.frame);

    return typeof paint === 'string' ? { color: paint } : paint;
  }

  private geometry(): Graphics {
    return this.path.draw(this.visual('graphics').object as Graphics, this.state.dash);
  }

  drawImage(source: CanvasImageSource, ...args: number[]) {
    this.shadow(() => {
      return this.drawImage(source, ...args);
    });
    const draw = this.sources.prepare(source, args, this.frame);
    if (!draw) {
      return;
    }

    const { sw, sh, dx, dy, dw, dh } = draw;
    const entity = this.visual('sprite');
    const sprite = entity.object as Sprite;
    this.sources.applyFrame(entity, draw, this.imageSmoothingEnabled);
    const tint = this.paints.color(
      this.shadowPass ? this.state.shadowColor : this.state.spriteTint,
    );
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
    if (this.state.occlusion && !this.shadowPass) {
      this.cutout.apply(sprite, this.state.matrix, dx, dy, dw, dh);
    }
  }

  fillRect(x: number, y: number, width: number, height: number) {
    this.rectangleShadow(x, y, width, height);
    if (typeof this.state.fillStyle !== 'string') {
      const g = this.visual('graphics').object as Graphics;
      g.clear().rect(x, y, width, height).fill(this.paints.paint(this.state.fillStyle, this.frame));

      return;
    }

    const sprite = this.visual('sprite').object as Sprite;
    const color = this.paints.color(this.state.fillStyle);
    sprite.texture = Texture.WHITE;
    sprite.tint = color.toNumber();
    sprite.alpha = this.state.globalAlpha * color.alpha;
    this.applyTransform(sprite, x, y, width, height);
  }

  strokeRect(x: number, y: number, width: number, height: number) {
    this.shadow(() => {
      return this.strokeRect(x, y, width, height);
    });
    const g = this.visual('graphics').object as Graphics;
    g.clear()
      .rect(x, y, width, height)
      .stroke({ ...this.strokePaint(), width: this.state.lineWidth });
  }

  clearRect() {
    this.begin();
  }

  fill() {
    this.shadow(() => {
      return this.fill();
    });
    this.geometry().fill(this.paints.paint(this.state.fillStyle, this.frame));
  }

  stroke() {
    this.shadow(() => {
      return this.stroke();
    });
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

  private text(value: string, x: number, y: number, stroke: boolean) {
    this.shadow(() => {
      return this.text(value, x, y, stroke);
    });
    const entity = this.visual('text');
    const text = entity.object;
    updateText(
      entity,
      value,
      this.state,
      stroke ? 'transparent' : this.paints.paint(this.state.fillStyle, this.frame),
      stroke
        ? { ...this.strokePaint(), width: this.state.lineWidth, join: this.state.lineJoin }
        : undefined,
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
