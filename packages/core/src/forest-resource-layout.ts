// Existing offsets space each resource around its deterministic tree without changing resource IDs.
export const FOREST_RESOURCE_LAYOUT = {
  plant: { x: 65, y: 45, size: 32 },
  rock: { x: -55, y: 65, size: 40 },
  stone: { x: 45, y: -65, size: 26 },
} as const;
