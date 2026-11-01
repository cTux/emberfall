// These existing 32-bit LCG coefficients keep scenery positions and resource identities stable.
export const SCENERY_RANDOM = {
  multiplier: 1664525,
  increment: 1013904223,
  modulus: 4294967296,
} as const;
