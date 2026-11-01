// The authored wrapped map stays 4,800 by 2,560 units; changing dimensions moves existing content.
export const FOREST = { width: 4800, height: 2560 } as const;
// Authored village portal position and forest-center destination preserve existing travel placement.
export const LOBBY_PORTAL = { x: 550, y: 365 } as const;
export const FOREST_PORTAL = { x: 2400, y: 1280 } as const;
// Sixty-eight units is the existing reach for nearby world interactions; retain its calibrated feel.
export const INTERACTION_RADIUS = 68;
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
