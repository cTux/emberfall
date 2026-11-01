// Preview clocks deliberately slow attacks to 600 ms within a 780 ms cycle so both poses can be inspected.
export const GALLERY_TIMING = {
  attackCycleMs: 780,
  attackDurationMs: 600,
  animalStepMs: 150,
  effectStepMs: 120,
  wardrobeStepMs: 220,
} as const;
// Frame IDs/counts follow the packaged animal, bear, wardrobe and scenery atlases.
export const GALLERY_FRAMES = {
  bearFallen: 7,
  bearWindup: 5,
  playableClasses: 4,
  animals: 4,
  animalWalk: 3,
  bearWalk: 4,
  bearColumns: 4,
  effects: 4,
  projectileEffects: 3,
  scenery: 9,
  sceneryColumns: 3,
  torch: 6,
} as const;
// Fixed preview spacing reserves room for enlarged actors, labels and the three native-resolution building samples.
export const GALLERY_GRID = {
  actorLeft: 20,
  actorTop: 20,
  actorColumns: 5,
  actorStrideX: 235,
  actorStrideY: 200,
  animalStride: 230,
  sceneryWidth: 126,
  sceneryLeft: 10,
  sceneryStride: 132,
  sceneryBottom: 1000,
  torchCenterOffset: 63,
  sceneryHeight: 160,
} as const;
// This ping-pong sequence holds each fully open/closed wardrobe pose before changing direction.
export const WARDROBE_PREVIEW_FRAMES = [0, 0, 1, 2, 3, 3, 2, 1];
