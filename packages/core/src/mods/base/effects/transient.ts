// Existing visual timing keeps damage readable for 800 ms, brief impact cues and 30-second blood marks.
// Explosion radius retains its authored 100-unit presentation footprint.
export const TRANSIENT_EFFECTS = {
  damage: { id: 'damage', lifetimeMs: 800 },
  explosion: { id: 'explosion', lifetimeMs: 350, radius: 100 },
  blood: { id: 'blood', lifetimeMs: 30000 },
  hitFlash: { id: 'hit-flash', lifetimeMs: 220 },
} as const;
