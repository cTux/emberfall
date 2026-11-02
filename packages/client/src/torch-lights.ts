import type { Light } from './lighting';
import { TORCHES } from '@emberfall/core';

// Retain the existing warm, local torch pool rather than changing village visibility.
export const TORCH_LIGHTS: Light[] = TORCHES.map((t, i) => {
  return {
    ...t,
    height: 85,
    radius: 145,
    strength: 0.24,
    owner: `torch:${i}`,
  };
});
