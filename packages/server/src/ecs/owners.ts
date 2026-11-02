import type { SimulationWorld } from './simulation-world.ts';
import type { Player } from '@emberfall/core/contracts';

export const owners = new WeakMap<Map<string, Player>, SimulationWorld>();
