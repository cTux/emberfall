import type { Bounds } from './bounds.ts';
import { sampleCritters } from './sample-critters.ts';

export function crittersAt(area: 'village' | 'forest', now: number, bounds: Bounds) {
  return sampleCritters(area, now, bounds);
}
