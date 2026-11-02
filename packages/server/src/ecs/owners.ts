import type { SimulationWorld } from './simulation-world.ts';
import type { Player } from '@emberfall/common';

export const owners = new WeakMap<Map<string, Player>, SimulationWorld>();
