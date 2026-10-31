import { Texture, Rectangle, type Sprite } from 'pixi.js';
import type { Visual } from './visual-pools';

type ImageDraw = {
  texture: Texture;
  sx: number;
  sy: number;
  sw: number;
  sh: number;
  dx: number;
  dy: number;
  dw: number;
  dh: number;
};

export class ImageTextures {
  // The adapter consumes this scratch layout before another image is prepared.
  private draw: ImageDraw = {
    texture: Texture.EMPTY,
    sx: 0,
    sy: 0,
    sw: 0,
    sh: 0,
    dx: 0,
    dy: 0,
    dw: 0,
    dh: 0,
  };
  private entries = new Map<CanvasImageSource, { texture: Texture; used: number }>();

  get size() {
    return this.entries.size;
  }

  prepare(source: CanvasImageSource, args: number[], frame: number): ImageDraw | undefined {
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
    let entry = this.entries.get(source);
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
      entry = { texture, used: frame };
      this.entries.set(source, entry);
    }

    // Dynamic light canvases explicitly mark their revision when repainted.
    const revision = (image as HTMLCanvasElement & { textureRevision?: number }).textureRevision;
    const textureRevision = (entry as typeof entry & { revision?: number }).revision;
    if (revision !== undefined && revision !== textureRevision) {
      entry.texture.source.update();
      (entry as typeof entry & { revision?: number }).revision = revision;
    }

    entry.used = frame;
    this.draw.texture = entry.texture;
    this.draw.sx = sx;
    this.draw.sy = sy;
    this.draw.sw = sw;
    this.draw.sh = sh;
    this.draw.dx = dx;
    this.draw.dy = dy;
    this.draw.dw = dw;
    this.draw.dh = dh;

    return this.draw;
  }

  applyFrame(entity: Visual, draw: ImageDraw, smoothing: boolean) {
    const { sx, sy, sw, sh } = draw;
    const sprite = entity.object as Sprite;
    let texture = entity.frameTexture;
    const scaleMode = smoothing ? 'linear' : 'nearest';
    if (draw.texture.source.scaleMode !== scaleMode) {
      draw.texture.source.scaleMode = scaleMode;
      draw.texture.source.style.update();
    }

    if (!texture)
      texture = entity.frameTexture = new Texture({
        source: draw.texture.source,
        frame: new Rectangle(sx, sy, sw, sh),
        dynamic: true,
      });
    else if (
      texture.source !== draw.texture.source ||
      texture.frame.x !== sx ||
      texture.frame.y !== sy ||
      texture.frame.width !== sw ||
      texture.frame.height !== sh
    ) {
      texture.source = draw.texture.source;
      texture.frame.copyFrom(new Rectangle(sx, sy, sw, sh));
      texture.orig.width = sw;
      texture.orig.height = sh;
      texture.update();
    }

    sprite.texture = texture;
  }

  trim(frame: number) {
    for (const [key, entry] of this.entries)
      if (frame - entry.used > 600) {
        entry.texture.destroy(true);
        this.entries.delete(key);
      }
  }

  destroy() {
    for (const entry of this.entries.values()) entry.texture.destroy(true);
    this.entries.clear();
  }
}
