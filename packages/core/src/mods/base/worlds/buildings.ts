// Positions/door anchors match the authored village plan; source offsets/widths select existing sprite crops.
export const BUILDINGS = [
  { id: 'inn', name: 'Inn', x: 235, y: 225, doorX: 219, sourceX: 0, sourceWidth: 64 },
  { id: 'hall', name: 'Hall', x: 485, y: 170, doorX: 469, sourceX: 192, sourceWidth: 64 },
  { id: 'workshop', name: 'Workshop', x: 735, y: 235, doorX: 751, sourceX: 304, sourceWidth: 64 },
  {
    id: 'storehouse',
    name: 'Storehouse',
    x: 240,
    y: 510,
    doorX: 224,
    sourceX: 128,
    sourceWidth: 64,
  },
  { id: 'lodge', name: 'Lodge', x: 730, y: 510, doorX: 730, sourceX: 256, sourceWidth: 48 },
] as const;
