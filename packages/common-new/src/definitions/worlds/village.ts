export const ARENA = { width: 4800, height: 2560, speed: 180 } as const;
export const WARDROBE = { x: 350, y: 365 };
export const TRAINING_ZONES = [
  { x: 140, y: 355, radius: 270, clearingRadius: 135 },
  { x: 820, y: 355, radius: 270, clearingRadius: 135 },
] as const;
export const BUILDINGS = [
  { id: "inn", name: "Inn", x: 235, y: 225, doorX: 219, sourceX: 0, sourceWidth: 64 },
  { id: "hall", name: "Hall", x: 485, y: 170, doorX: 469, sourceX: 192, sourceWidth: 64 },
  { id: "workshop", name: "Workshop", x: 735, y: 235, doorX: 751, sourceX: 304, sourceWidth: 64 },
  {
    id: "storehouse",
    name: "Storehouse",
    x: 240,
    y: 510,
    doorX: 224,
    sourceX: 128,
    sourceWidth: 64,
  },
  { id: "lodge", name: "Lodge", x: 730, y: 510, doorX: 730, sourceX: 256, sourceWidth: 48 },
] as const;
export const TORCHES = [
  { x: 330, y: 249 },
  { x: 620, y: 249 },
  { x: 520, y: 220 },
  { x: 440, y: 435 },
  { x: 520, y: 490 },
  { x: 345, y: 580 },
  { x: 635, y: 580 },
] as const;
export const PATH_CURVES = [
  [
    { x: WARDROBE.x, y: WARDROBE.y },
    { x: 350, y: 435 },
    { x: 420, y: 425 },
    { x: 480, y: 355 },
  ],
  [
    { x: BUILDINGS[0].doorX, y: BUILDINGS[0].y },
    { x: BUILDINGS[0].doorX, y: 320 },
    { x: 420, y: 235 },
    { x: 480, y: 355 },
  ],
  [
    { x: BUILDINGS[1].doorX, y: BUILDINGS[1].y },
    { x: 440, y: 240 },
    { x: 510, y: 275 },
    { x: 480, y: 355 },
  ],
  [
    { x: BUILDINGS[2].doorX, y: BUILDINGS[2].y },
    { x: 755, y: 330 },
    { x: 580, y: 260 },
    { x: 480, y: 355 },
  ],
  [
    { x: 480, y: 355 },
    { x: 430, y: 415 },
    { x: 535, y: 455 },
    { x: 480, y: 515 },
  ],
  [
    { x: 480, y: 515 },
    { x: 400, y: 530 },
    { x: 225, y: 585 },
    { x: BUILDINGS[3].doorX, y: BUILDINGS[3].y },
  ],
  [
    { x: 480, y: 515 },
    { x: 575, y: 525 },
    { x: 715, y: 585 },
    { x: BUILDINGS[4].doorX, y: BUILDINGS[4].y },
  ],
] as const;
export const VILLAGE_DEFINITION = {
  id: "village",
  geometry: ARENA,
  wardrobe: WARDROBE,
  buildings: BUILDINGS,
  torches: TORCHES,
  trainingZones: TRAINING_ZONES,
  paths: PATH_CURVES,
  treeSeed: 8927,
  treeAttempts: 550,
  spawn: { x: 420, y: 340, spacing: 22 },
  returnSpawn: { x: 480, y: 360 },
} as const;
