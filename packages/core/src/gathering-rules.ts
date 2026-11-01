// Existing offsets space each resource around its deterministic tree without changing resource IDs.
export const FOREST_RESOURCE_LAYOUT = {
  plant: { x: 65, y: 45, size: 32 },
  rock: { x: -55, y: 65, size: 40 },
  stone: { x: 45, y: -65, size: 26 },
} as const;
// Retain the existing query padding so displaced resource nodes remain discoverable at range edges.
export const FOREST_RESOURCE_QUERY_PADDING = 180;
// Existing tree depletion permits five gathers before the one-hour regeneration timer.
export const TREE_GATHER_COUNT = 5;
// Existing independent chances permit multi-drops: logs are common, sticks and leaves less so.
export const TREE_DROPS = { log: 0.8, stick: 0.4, leaf: 0.2 } as const;
