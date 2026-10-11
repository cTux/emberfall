export const TRANSIENT_EFFECTS = {
  damage: { id: "damage", lifetimeMs: 800 },
  explosion: { id: "explosion", lifetimeMs: 350, radius: 100 },
  blood: { id: "blood", lifetimeMs: 30000 },
  hitFlash: { id: "hit-flash", lifetimeMs: 220 },
} as const;
