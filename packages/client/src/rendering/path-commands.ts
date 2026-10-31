import { DrawingState } from './drawing-state';
import { DrawingPath } from './drawing-path';

export class PathCommands extends DrawingState {
  protected path = new DrawingPath();

  beginPath() {
    this.path.reset();
  }

  closePath() {
    this.path.add('closePath');
  }

  moveTo(x: number, y: number) {
    this.path.add('moveTo', x, y);
  }

  lineTo(x: number, y: number) {
    this.path.add('lineTo', x, y);
  }

  quadraticCurveTo(controlX: number, controlY: number, x: number, y: number) {
    this.path.add('quadraticCurveTo', controlX, controlY, x, y);
  }

  bezierCurveTo(
    controlX1: number,
    controlY1: number,
    controlX2: number,
    controlY2: number,
    x: number,
    y: number,
  ) {
    this.path.add('bezierCurveTo', controlX1, controlY1, controlX2, controlY2, x, y);
  }

  arc(
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false,
  ) {
    this.path.add('arc', x, y, radius, startAngle, endAngle, counterclockwise);
  }

  ellipse(
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise = false,
  ) {
    this.path.add(
      'ellipse',
      x,
      y,
      radiusX,
      radiusY,
      rotation,
      startAngle,
      endAngle,
      counterclockwise,
    );
  }
}
