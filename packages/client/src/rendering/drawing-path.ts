import type { Graphics } from 'pixi.js';

type PathCommand = {
  method:
    | 'moveTo'
    | 'lineTo'
    | 'quadraticCurveTo'
    | 'bezierCurveTo'
    | 'arc'
    | 'ellipse'
    | 'closePath';
  args: number[];
};

export class DrawingPath {
  private commands: PathCommand[] = [];

  reset() {
    this.commands.length = 0;
  }

  add(method: PathCommand['method'], args: number[]) {
    this.commands.push({ method, args });
  }

  draw(graphics: Graphics, values: number[]): Graphics {
    graphics.clear();
    let penX = 0,
      penY = 0,
      dashAt = 0;
    const dash = values.filter((n) => {
      return n > 0;
    });

    for (const { method, args } of this.commands) {
      if (method === 'ellipse') {
        const [x, y, rx, ry, rotation, start, end, ccw] = args;
        // Flatten rotated/partial ellipses into a short polygon in local coordinates.
        const sweep = ccw
          ? -((start - end + Math.PI * 2) % (Math.PI * 2) || Math.PI * 2)
          : (end - start) % (Math.PI * 2) || Math.PI * 2;
        const count = Math.max(12, Math.ceil((Math.abs(sweep) * Math.max(rx, ry)) / 4));

        for (let i = 0; i <= count; i++) {
          const angle = start + (sweep * i) / count;
          const px = Math.cos(angle) * rx,
            py = Math.sin(angle) * ry;
          const tx = x + px * Math.cos(rotation) - py * Math.sin(rotation),
            ty = y + px * Math.sin(rotation) + py * Math.cos(rotation);

          if (i === 0) {
            graphics.moveTo(tx, ty);
          } else {
            graphics.lineTo(tx, ty);
          }
        }
      } else if (method === 'arc') {
        graphics.arc(args[0], args[1], args[2], args[3], args[4], !!args[5]);
      } else if (method === 'moveTo') {
        graphics.moveTo(args[0], args[1]);
        penX = args[0];
        penY = args[1];
        dashAt = 0;
      } else if (method === 'lineTo') {
        if (dash.length) {
          const dx = args[0] - penX,
            dy = args[1] - penY,
            length = Math.hypot(dx, dy);
          const cycle = dash.reduce((sum, n) => {
            return sum + n;
          }, 0);

          for (let at = 0; at < length;) {
            let offset = dashAt % cycle,
              index = 0;
            while (offset >= dash[index]) {
              offset -= dash[index];
              index++;
            }

            const step = Math.min(length - at, dash[index] - offset);
            at += step;
            dashAt += step;
            const x = penX + (dx * at) / length,
              y = penY + (dy * at) / length;

            if (index % 2 === 0) {
              graphics.lineTo(x, y);
            } else {
              graphics.moveTo(x, y);
            }
          }
        } else {
          graphics.lineTo(args[0], args[1]);
        }

        penX = args[0];
        penY = args[1];
      } else if (method === 'quadraticCurveTo') {
        graphics.quadraticCurveTo(args[0], args[1], args[2], args[3]);
      } else if (method === 'bezierCurveTo') {
        graphics.bezierCurveTo(args[0], args[1], args[2], args[3], args[4], args[5]);
      } else {
        graphics.closePath();
      }
    }

    return graphics;
  }
}
