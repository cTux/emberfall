import {
  autoDetectRenderer,
  Texture,
  type Container,
  type Renderer,
  type BindGroup,
} from 'pixi.js';
import './soft-light';

export class RendererDriver {
  private renderer?: Renderer;
  private disposed = false;
  private width = 1;
  private height = 1;
  readonly canvas: HTMLCanvasElement;
  readonly ready: Promise<void>;
  constructor(canvas: HTMLCanvasElement) {
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
  render(stage: Container) {
    if (!this.renderer) return;
    if (this.renderer.width !== this.canvas.width || this.renderer.height !== this.canvas.height)
      this.renderer.resize(this.canvas.width, this.canvas.height);
    try {
      this.renderer.render(stage);
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
  }
  destroy() {
    this.disposed = true;
    this.renderer?.destroy();
  }
}
