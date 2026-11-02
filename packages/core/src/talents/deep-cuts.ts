import type { Enemy, Player } from '@emberfall/common';

export const deepCuts = new WeakMap<Enemy, WeakMap<Player, number>>();
