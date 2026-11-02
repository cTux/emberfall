import type { Caster } from './lighting';
import type { VillageNpc } from '@emberfall/core/contracts';

export interface Scenery extends Caster {
  kind?: 'tree' | 'plant' | 'rock' | 'stone';
  gathered?: boolean;
  npc?: VillageNpc;
  sprite: HTMLCanvasElement;
  name?: string;
  chimney?: { x: number; y: number };
  frames?: { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }[];
}
