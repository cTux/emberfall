// Preview clocks deliberately slow attacks to 600 ms within a 780 ms cycle so both poses can be inspected.
export const GALLERY_TIMING = {
  attackCycleMs: 780,
  attackDurationMs: 600,
  animalStepMs: 150,
  effectStepMs: 120,
  wardrobeStepMs: 220,
} as const;
