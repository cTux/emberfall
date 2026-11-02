import { FOREST } from './forest-geometry.ts';
import { FOREST_PORTAL } from './forest-portal.ts';

// Keep two-minute runs, a five-second departure countdown and the existing tree density/clearance scale.
export const FOREST_DEFINITION = {
  id: 'forest',
  geometry: FOREST,
  portal: FOREST_PORTAL,
  durationMs: 120000,
  countdownMs: 5000,
  treeCellSize: 160,
  treeRadius: 15,
} as const;
