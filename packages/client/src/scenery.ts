import type { Caster } from './lighting';
import type { VillageNpc } from '@emberfall/common';

export interface Scenery extends Caster {
  kind?: 'tree' | 'plant' | 'rock' | 'stone';
  gathered?: boolean;
  npc?: VillageNpc;
  sprite: HTMLCanvasElement;
  name?: string;
  chimney?: { x: number; y: number };
  frames?: { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }[];
}
