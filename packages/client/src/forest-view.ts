// Preserve the existing 960x640 logical camera and 320-pixel ground tiles; tall scenery needs a 300-pixel culling margin.
export const FOREST_VIEW = {
  width: 960,
  height: 640,
  tileSize: 320,
  sceneryMargin: 300,
  demoX: 2400,
  demoY: 1280,
  demoSwayMs: 25000,
  demoSway: 70,
} as const;
