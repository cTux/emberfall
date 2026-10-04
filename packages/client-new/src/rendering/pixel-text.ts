import { Texture } from "pixi.js";

/** Native-size hard glyph masks. Color and opacity stay on the GPU sprite. */
export class PixelTextCache {
  private entries = new Map<
    string,
    {
      texture: Texture;
      x: number;
      y: number;
      width: number;
      ascent: number;
      descent: number;
      used: number;
    }
  >();
  private dirty = false;
  private fontsLoaded = () => {
    this.dirty = true;
  };
  constructor() {
    document.fonts.addEventListener("loadingdone", this.fontsLoaded);
  }
  begin() {
    if (this.dirty) {
      this.clear();
      this.dirty = false;
    }
  }
  get(value: string, font: string, stroke: number, join: CanvasLineJoin, frame: number) {
    const key = JSON.stringify([value, font, stroke, join]);
    let entry = this.entries.get(key);
    if (!entry) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d")!;
      ctx.font = font;
      const metrics = ctx.measureText(value);
      const padding = Math.ceil(stroke) + 2;
      const left = Math.ceil(metrics.actualBoundingBoxLeft) + padding;
      const top = Math.ceil(metrics.actualBoundingBoxAscent) + padding;
      canvas.width = Math.max(1, left + Math.ceil(metrics.actualBoundingBoxRight) + padding);
      canvas.height = Math.max(1, top + Math.ceil(metrics.actualBoundingBoxDescent) + padding);
      ctx.font = font;
      ctx.fillStyle = ctx.strokeStyle = "white";
      ctx.lineWidth = stroke;
      ctx.lineJoin = join;
      if (stroke) ctx.strokeText(value, left, top);
      else ctx.fillText(value, left, top);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        // Retain thin small-font strokes, but never retain partially covered edges.
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
        pixels.data[i + 3] = pixels.data[i + 3] >= 96 ? 255 : 0;
      }
      ctx.putImageData(pixels, 0, 0);
      const texture = Texture.from(canvas);
      texture.source.scaleMode = "nearest";
      entry = {
        texture,
        x: -left,
        y: -top,
        width: metrics.width,
        ascent: metrics.fontBoundingBoxAscent,
        descent: metrics.fontBoundingBoxDescent,
        used: frame,
      };
      this.entries.set(key, entry);
    }
    entry.used = frame;
    return entry;
  }
  trim(frame: number) {
    for (const [key, entry] of this.entries) {
      if (entry.used !== frame && (this.entries.size > 512 || frame - entry.used > 600)) {
        entry.texture.destroy(true);
        this.entries.delete(key);
      }
    }
  }
  private clear() {
    for (const entry of this.entries.values()) entry.texture.destroy(true);
    this.entries.clear();
  }
  destroy() {
    document.fonts.removeEventListener("loadingdone", this.fontsLoaded);
    this.clear();
  }
}
