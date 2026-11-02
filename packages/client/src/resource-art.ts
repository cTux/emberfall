// Source art grids use 128-pixel scenery frames and 64-pixel plants; depleted stumps retain their approved 48% scale.
export const RESOURCE_ART = {
  frameSize: 128,
  plantFrameSize: 64,
  stumpScale: 0.48,
  treeHarvests: 5,
  plantColumn: 2,
  rockRow: 2,
} as const;
