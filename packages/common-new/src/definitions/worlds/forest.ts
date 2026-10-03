export const FOREST = { width: 4800, height: 2560 } as const;
export const LOBBY_PORTAL = { x: 550, y: 365 } as const;
export const FOREST_PORTAL = { x: 2400, y: 1280 } as const;
export const INTERACTION_RADIUS = 68;
export const FOREST_DEFINITION = {
  id: "forest",
  geometry: FOREST,
  portal: FOREST_PORTAL,
  durationMs: 120000,
  countdownMs: 5000,
  treeCellSize: 160,
  treeRadius: 15,
} as const;
