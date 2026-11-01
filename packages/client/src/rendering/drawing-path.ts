import { RENDER_TUNING as TUNING } from './tuning.ts';
import type { Graphics } from 'pixi.js';

type PathParameters = {
  ellipse: [
    x: number,
    y: number,
    radiusX: number,
    radiusY: number,
    rotation: number,
    startAngle: number,
    endAngle: number,
    counterclockwise: boolean,
  ];
  arc: [
    x: number,
    y: number,
    radius: number,
    startAngle: number,
    endAngle: number,
    counterclockwise: boolean,
  ];
  moveTo: [x: number, y: number];
  lineTo: [x: number, y: number];
  quadraticCurveTo: [controlX: number, controlY: number, x: number, y: number];
  bezierCurveTo: [
    controlX1: number,
    controlY1: number,
    controlX2: number,
    controlY2: number,
    x: number,
    y: number,
  ];
  closePath: [];
};
type PathCommand<K extends keyof PathParameters = keyof PathParameters> = {
  method: K;
  parameters: PathParameters[K];
};
type PathState = { penX: number; penY: number; dashAt: number; dash: number[] };
type PathHandlers = {
  [K in keyof PathParameters]: (
    graphics: Graphics,
    state: PathState,
    ...parameters: PathParameters[K]
  ) => void;
};

const methods: PathHandlers = {
  ellipse(
    graphics,
    _state,
    x,
    y,
    radiusX,
    radiusY,
    rotation,
    startAngle,
    endAngle,
    counterclockwise,
  ) {
    // Flatten rotated/partial ellipses into a short polygon in local coordinates.
    const sweep = counterclockwise
      ? -((startAngle - endAngle + Math.PI * 2) % (Math.PI * 2) || Math.PI * 2)
      : (endAngle - startAngle) % (Math.PI * 2) || Math.PI * 2;
    const count = Math.max(
      TUNING.minimumEllipseSegments,
      Math.ceil((Math.abs(sweep) * Math.max(radiusX, radiusY)) / TUNING.ellipseSegmentPixels),
    );

    for (let i = 0; i <= count; i++) {
      const angle = startAngle + (sweep * i) / count;
      const px = Math.cos(angle) * radiusX,
        py = Math.sin(angle) * radiusY;
      const tx = x + px * Math.cos(rotation) - py * Math.sin(rotation),
        ty = y + px * Math.sin(rotation) + py * Math.cos(rotation);

      if (i === 0) {
        graphics.moveTo(tx, ty);
      } else {
        graphics.lineTo(tx, ty);
      }
    }
  },
  arc(graphics, _state, x, y, radius, startAngle, endAngle, counterclockwise) {
    graphics.arc(x, y, radius, startAngle, endAngle, counterclockwise);
  },
  moveTo(graphics, state, x, y) {
    graphics.moveTo(x, y);
    state.penX = x;
    state.penY = y;
    state.dashAt = 0;
  },
  lineTo(graphics, state, x, y) {
    if (state.dash.length) {
      const dx = x - state.penX,
        dy = y - state.penY,
        length = Math.hypot(dx, dy);
      const cycle = state.dash.reduce((sum, n) => {
        return sum + n;
      }, 0);

      for (let at = 0; at < length;) {
        let offset = state.dashAt % cycle,
          index = 0;
        while (offset >= state.dash[index]) {
          offset -= state.dash[index];
          index++;
        }

        const step = Math.min(length - at, state.dash[index] - offset);
        at += step;
        state.dashAt += step;
        const x = state.penX + (dx * at) / length,
          y = state.penY + (dy * at) / length;

        if (index % 2 === 0) {
          graphics.lineTo(x, y);
        } else {
          graphics.moveTo(x, y);
        }
      }
    } else {
      graphics.lineTo(x, y);
    }

    state.penX = x;
    state.penY = y;
  },
  quadraticCurveTo(graphics, _state, controlX, controlY, x, y) {
    graphics.quadraticCurveTo(controlX, controlY, x, y);
  },
  bezierCurveTo(graphics, _state, controlX1, controlY1, controlX2, controlY2, x, y) {
    graphics.bezierCurveTo(controlX1, controlY1, controlX2, controlY2, x, y);
  },
  closePath(graphics) {
    graphics.closePath();
  },
};

function replay<K extends keyof PathParameters>(
  command: PathCommand<K>,
  graphics: Graphics,
  state: PathState,
) {
  methods[command.method](graphics, state, ...command.parameters);
}

export class DrawingPath {
  private commands: PathCommand[] = [];

  reset() {
    this.commands.length = 0;
  }

  add<K extends keyof PathParameters>(method: K, ...parameters: PathParameters[K]) {
    this.commands.push({ method, parameters });
  }

  draw(graphics: Graphics, values: number[]): Graphics {
    graphics.clear();
    const state: PathState = {
      penX: 0,
      penY: 0,
      dashAt: 0,
      dash: values.filter((length) => {
        return length > 0;
      }),
    };

    for (const command of this.commands) {
      replay(command, graphics, state);
    }

    return graphics;
  }
}
