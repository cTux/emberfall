export const VILLAGE_CRITTERS = [
  { x: 280, y: 278, kind: "cat" },
  { x: 650, y: 278, kind: "chicken" },
  { x: 385, y: 445, kind: "chicken" },
  { x: 590, y: 470, kind: "cat" },
  { x: 300, y: 550, kind: "chicken" },
  { x: 660, y: 550, kind: "cat" },
] as const;
export const CRITTER_DEFINITIONS = {
  cat: { id: "cat", sprite: "/assets/critter-cat.png" },
  chicken: { id: "chicken", sprite: "/assets/critter-chicken.png" },
  raccoon: { id: "raccoon", sprite: "/assets/critter-raccoon.png" },
} as const;
export type CritterKind = keyof typeof CRITTER_DEFINITIONS;
