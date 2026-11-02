import { WIND } from './world-style.ts';

export function vegetationSway(
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
  grass = false,
) {
  const phase = x * WIND.xPhase + y * WIND.yPhase;

  return (
    (Math.sin(now / WIND.primaryPeriodMs + phase) +
      Math.sin(now / WIND.secondaryPeriodMs + phase * WIND.secondaryPhase) * WIND.secondaryWeight) *
    (width / height) *
    (grass ? WIND.grassShear : WIND.foliageShear)
  );
}
