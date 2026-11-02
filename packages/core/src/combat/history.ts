import type { MeterKey } from './meter-key.ts';
import type { Player } from '@emberfall/core/contracts';
type Meter = NonNullable<Player[MeterKey]>;
export const history = new WeakMap<
  Meter,
  {
    at: number;
    amount: number;
  }[]
>();
