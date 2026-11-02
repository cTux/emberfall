import type { GradientOptions } from 'pixi.js';

export class Gradient {
  options: GradientOptions;

  constructor(options: GradientOptions) {
    this.options = options;
  }

  addColorStop(offset: number, color: string) {
    (this.options.colorStops ??= []).push({ offset, color });
  }
}
