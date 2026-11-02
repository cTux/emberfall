import { spriteMask } from './lighting';
import { ACTOR_CELL } from './animation';

export function forestActorMask(image: HTMLImageElement, column: number, row: number) {
  return spriteMask(image, column, row, false, ACTOR_CELL, false, ACTOR_CELL)!;
}
