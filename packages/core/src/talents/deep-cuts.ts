import type { Enemy, Player } from '@emberfall/core/contracts';

export const deepCuts = new WeakMap<Enemy, WeakMap<Player, number>>();
