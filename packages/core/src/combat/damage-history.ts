import type { Player } from '@emberfall/common';

export const damageHistory = new WeakMap<
  Player,
  { at: number; amount: number; ability: string }[]
>();
