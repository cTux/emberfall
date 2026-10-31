export class ShadowPrimitives {
  private entries = new Map<string, HTMLCanvasElement>();

  rectangle(width: number, height: number, blur: number, opacity: number, color: string) {
    const padding = Math.ceil(blur * 3 + 2);
    const key = `${width}:${height}:${blur}:${opacity}:${color}`;
    let canvas = this.entries.get(key);
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.width = Math.ceil(Math.abs(width) + padding * 2);
      canvas.height = Math.ceil(Math.abs(height) + padding * 2);
      const ctx = canvas.getContext('2d')!;
      // Bake a reusable glow primitive. The solid source is moved outside the
      // image so only its shadow remains; no per-particle GPU filter passes.
      ctx.shadowBlur = blur;
      ctx.shadowColor = color;
      ctx.shadowOffsetX = canvas.width * 2;
      ctx.globalAlpha = opacity;
      ctx.fillRect(padding - canvas.width * 2, padding, Math.abs(width), Math.abs(height));
      if (this.entries.size >= 128) this.entries.delete(this.entries.keys().next().value!);
      this.entries.set(key, canvas);
    }

    return canvas;
  }

  clear() {
    this.entries.clear();
  }
}
