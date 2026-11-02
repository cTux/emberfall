import type { Player } from '@emberfall/core/contracts';

export const damageHistory = new WeakMap<
  Player,
  { at: number; amount: number; ability: string }[]
>();
