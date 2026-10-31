import { Graphics, Matrix, Rectangle, type Sprite } from 'pixi.js';
import { playerCutoutRuns, PLAYER_CUTOUT_MARGIN } from './player-cutout';
import { applyTransform, transformedBounds } from './drawing-transform';

export class PlayerOcclusion {
  private cutout = new Graphics();
  private runs?: ReturnType<typeof playerCutoutRuns>;
  private enabled = false;
  private bounds = new Rectangle();
  private spriteBounds = new Rectangle();
  private matrix = new Matrix();
  private place: (graphics: Graphics) => void;

  constructor(place: (graphics: Graphics) => void) {
    this.place = place;
  }

  begin() {
    this.enabled = false;
  }

  finish() {
    this.cutout.includeInBuild = false;
  }

  configure(
    mask: HTMLCanvasElement,
    x: number,
    y: number,
    width: number,
    height: number,
    matrix: Matrix,
  ) {
    const runs = playerCutoutRuns(mask, width, height);

    if (runs !== this.runs) {
      this.cutout.clear();

      for (const [x, y, width] of runs) {
        this.cutout.rect(x, y, width, 1);
      }

      this.cutout.fill(0xffffff);
      this.runs = runs;
    }

    this.enabled = runs.length > 0;
    this.cutout.includeInBuild = false;
    this.place(this.cutout);
    applyTransform(
      this.cutout,
      matrix,
      this.matrix,
      x - PLAYER_CUTOUT_MARGIN,
      y - PLAYER_CUTOUT_MARGIN,
    );
    transformedBounds(
      matrix,
      this.bounds,
      x - PLAYER_CUTOUT_MARGIN,
      y - PLAYER_CUTOUT_MARGIN,
      Math.ceil(width) + 2 * PLAYER_CUTOUT_MARGIN,
      Math.ceil(height) + 2 * PLAYER_CUTOUT_MARGIN,
    );
  }

  apply(sprite: Sprite, matrix: Matrix, x: number, y: number, width: number, height: number) {
    if (
      this.enabled &&
      this.bounds.intersects(transformedBounds(matrix, this.spriteBounds, x, y, width, height))
    ) {
      sprite.setMask({ mask: this.cutout, inverse: true });
    }
  }

  destroy() {
    this.cutout.destroy();
  }
}
