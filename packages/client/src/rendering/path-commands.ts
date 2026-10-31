import { DrawingState } from './drawing-state';
import { DrawingPath } from './drawing-path';

export class PathCommands extends DrawingState {
  protected path = new DrawingPath();

  beginPath() {
    this.path.reset();
  }

  closePath() {
    this.path.add('closePath', []);
  }

  moveTo(...args: number[]) {
    this.path.add('moveTo', args);
  }

  lineTo(...args: number[]) {
    this.path.add('lineTo', args);
  }

  quadraticCurveTo(...args: number[]) {
    this.path.add('quadraticCurveTo', args);
  }

  bezierCurveTo(...args: number[]) {
    this.path.add('bezierCurveTo', args);
  }

  arc(x: number, y: number, r: number, start: number, end: number, ccw = false) {
    this.path.add('arc', [x, y, r, start, end, Number(ccw)]);
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
    this.path.add('ellipse', [x, y, rx, ry, rotation, start, end, Number(ccw)]);
  }
}
