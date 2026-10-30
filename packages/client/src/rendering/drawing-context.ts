import type { DirectionalShadow } from '../lighting';

type DrawingExtensions = {
  ambientTint?: number;
  directionalShadow?: DirectionalShadow;
  occlusion?: boolean;
  spriteTint?: string;
};

/** Commands supported by the GPU adapter, without Canvas pixel-readback or patterns. */
export interface GpuDrawingContext
  extends
    DrawingExtensions,
    Pick<
      CanvasRenderingContext2D,
      | 'canvas'
      | 'imageSmoothingEnabled'
      | 'globalAlpha'
      | 'lineWidth'
      | 'lineJoin'
      | 'font'
      | 'textAlign'
      | 'textBaseline'
      | 'shadowBlur'
      | 'shadowColor'
      | 'shadowOffsetY'
      | 'save'
      | 'restore'
      | 'resetTransform'
      | 'getTransform'
      | 'transform'
      | 'translate'
      | 'scale'
      | 'rotate'
      | 'setLineDash'
      | 'drawImage'
      | 'fillRect'
      | 'strokeRect'
      | 'beginPath'
      | 'closePath'
      | 'moveTo'
      | 'lineTo'
      | 'quadraticCurveTo'
      | 'bezierCurveTo'
      | 'arc'
      | 'ellipse'
      | 'createLinearGradient'
      | 'createRadialGradient'
      | 'measureText'
    > {
  fillStyle: string | CanvasGradient;
  strokeStyle: string | CanvasGradient;
  globalCompositeOperation: string;
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void;
  fillText(value: string, x: number, y: number): void;
  strokeText(value: string, x: number, y: number): void;
  fill(): void;
  stroke(): void;
  clip(): void;
}

/** Native contexts remain useful for asset baking and backend comparison tests. */
export type DrawingContext = GpuDrawingContext | (CanvasRenderingContext2D & DrawingExtensions);

export interface WorldDrawingContext extends GpuDrawingContext {
  ambientTint: number;
  spriteTint: string;
  occlusion: boolean;
  setPlayerCutout(
    mask: HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
}
