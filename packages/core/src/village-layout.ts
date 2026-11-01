// Existing ellipse calibration aligns the training check with the painted ground area.
export const TRAINING_FOOTPRINT = { yScale: 0.85 } as const;
// Thirty-two segments preserve the sampled village paths used by scenery clearance.
export const PATH_SEGMENTS = 32;
// A cubic Bezier has degree three and binomial coefficients 1, 3, 3, 1.
export const CUBIC_BEZIER_DEGREE = 3;
// Existing plaza ellipses reserve the walkway and its larger vegetation-free surroundings.
export const PLAZA = {
  x: 480,
  y: 355,
  pathX: 110,
  pathY: 75,
  clearingX: 190,
  clearingY: 110,
} as const;
// Existing margins leave entrances, training space and torch flames free of scenery.
export const SCENERY_CLEARANCE = {
  training: 35,
  path: 55,
  buildingX: 100,
  buildingAbove: 130,
  buildingBelow: 65,
  torch: 45,
  separation: 48,
} as const;
// Existing asymmetric edge insets preserve the approved village's generated layout.
export const SCENERY_BOUNDS = {
  left: 35,
  horizontalInset: 70,
  top: 55,
  verticalInset: 85,
} as const;
// Existing tree art ranges and trunk offsets align generated art, gathering and collision.
export const VILLAGE_TREE = { minSize: 72, sizeRange: 25, radius: 15, trunkOffsetY: 8 } as const;
// Legacy fallback seeds/attempt budgets retain the same layout when older mods omit these fields.
export const ROCK_SCATTER = { seed: 3719, attempts: 300, minSize: 32, sizeRange: 17 } as const;
export const PLANT_SCATTER = { seed: 6143, attempts: 1000, minSize: 28, sizeRange: 17 } as const;
// Existing collision silhouettes permit walking beside the painted fixtures rather than their full art.
export const VILLAGE_OBSTACLES = {
  wardrobeRadius: 18,
  torchRadius: 5,
  buildingInset: 8,
  buildingDepth: 40,
} as const;
// Existing path width matches the painted route used to keep vegetation out of walkways.
export const PATH_CLEARANCE = 28;
