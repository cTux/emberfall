// Existing debug geometry mirrors village collision/interaction placements; the thin outline keeps overlapping shapes readable.
export const HITBOX_PRESENTATION = {
  sceneryMargin: 150,
  treeCenterOffset: 8,
  torchRadius: 5,
  wardrobeRadius: 18,
  wardrobeReach: 55,
  doorOffset: 24,
  outlineWidth: 1.5,
} as const;

export const HITBOX_COLORS = {
  body: '#00ffff',
  projectile: '#ff00ff',
  scenery: '#ffff00',
  range: '#ff8800',
} as const;
