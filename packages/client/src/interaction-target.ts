import type { Interaction } from './effects';

export interface InteractionTarget {
  source: Interaction;
  x: number;
  y: number;
  width: number;
  height: number;
  mask: HTMLCanvasElement;
  reach: { x: number; y: number };
  radius: number;
  highlighted?: boolean;
}
