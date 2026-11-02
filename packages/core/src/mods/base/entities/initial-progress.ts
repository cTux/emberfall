// New characters retain the existing 100-HP health budget with no earned currency or progression.
export const INITIAL_PROGRESS = {
  level: 1,
  paragon: 0,
  experience: 0,
  coins: 0,
  hitpoints: 100,
  maxHitpoints: 100,
  playtimeSeconds: 0,
  talents: {},
} as const;
