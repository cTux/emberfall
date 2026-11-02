// Existing pickup artwork is baked at forty pixels; its small coin/mote drawing is authored in that space.
export const LOOT_STYLE = {
  spritePixels: 40,
  goldRadius: 4,
  moteRadius: 3.5,
  // Retain the authored shadow, beam and sprite anchors relative to the drop feet.
  shadowOffset: 2,
  beamHeight: 36,
  beamHalfWidth: 3,
  iconHalfWidth: 10,
  itemOffset: 18,
  pickupOffset: 16,
  fallbackHalfWidth: 20,
  fallbackOffset: 24,
  // Retain complete pickups just outside the viewport to prevent edge popping.
  cullMargin: 40,
  feetOffset: 15,
  // Preserve the original decaying drop bounce and event-dependent phase.
  bouncePeriodMs: 190,
  phasePerDrop: 0.7,
  idleBounce: 4,
  initialBounce: 7,
  bounceDecayMs: 650,
  // The pickup atlas has four animation columns and separate gold/experience rows.
  frames: 4,
  frameMs: 170,
  phaseMsPerDrop: 70,
  goldRow: 1,
  experienceRow: 2,
} as const;
