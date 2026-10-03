import { wrap, wrappedDelta } from "./scene.ts";

export const ARENA = { width: 4800, height: 2560, speed: 180 } as const;
export const WARDROBE = { x: 350, y: 365 };
export const TRAINING_ZONES = [
  { x: 140, y: 355, radius: 135 },
  { x: 820, y: 355, radius: 135 },
] as const;
export const inTrainingZone = (player: { x: number; y: number }) =>
  TRAINING_ZONES.some(
    (zone) =>
      Math.hypot(
        wrappedDelta(player.x, zone.x, ARENA.width) / zone.radius,
        wrappedDelta(player.y + 15, zone.y, ARENA.height) / (zone.radius * 0.85),
      ) <= 1,
  );
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
// Sample gentle Bezier bends once so drawing and vegetation clearance share the same route.
export const PATHS = [
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
].map(([start, bend1, bend2, end]) =>
  Array.from({ length: 33 }, (_, step) => {
    const t = step / 32,
      u = 1 - t;
    return {
      x: u ** 3 * start.x + 3 * u ** 2 * t * bend1.x + 3 * u * t ** 2 * bend2.x + t ** 3 * end.x,
      y: u ** 3 * start.y + 3 * u ** 2 * t * bend1.y + 3 * u * t ** 2 * bend2.y + t ** 3 * end.y,
    };
  }),
);
export function onPath(x: number, y: number, margin = 28) {
  if (Math.hypot((x - 480) / 110, (y - 355) / 75) < 1) return true;
  return PATHS.some((path) =>
    path.some((point, index) => {
      const next = path[index + 1];
      if (!next) return false;
      const dx = next.x - point.x,
        dy = next.y - point.y;
      const t = Math.max(
        0,
        Math.min(1, ((x - point.x) * dx + (y - point.y) * dy) / (dx * dx + dy * dy)),
      );
      return Math.hypot(x - point.x - t * dx, y - point.y - t * dy) < margin;
    }),
  );
}
export const TORCHES = [
  { x: 330, y: 249 },
  { x: 620, y: 249 },
  { x: 520, y: 220 },
  { x: 440, y: 435 },
  { x: 520, y: 490 },
  { x: 345, y: 580 },
  { x: 635, y: 580 },
] as const;
export interface Tree {
  x: number;
  y: number;
  size: number;
  radius: number;
}
const trees: Tree[] = [];
let seed = 8927;
const random = () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};
for (let i = 0; i < 550; i++) {
  const x = 35 + random() * (ARENA.width - 70);
  const y = 55 + random() * (ARENA.height - 85);
  if (TRAINING_ZONES.some((zone) => Math.hypot(x - zone.x, y - zone.y) < zone.radius + 35))
    continue;
  if (Math.hypot((x - 480) / 190, (y - 355) / 110) < 1 || onPath(x, y, 55)) continue;
  if (BUILDINGS.some((b) => Math.abs(x - b.x) < 100 && y > b.y - 130 && y < b.y + 65)) continue;
  if (TORCHES.some((t) => Math.hypot(t.x - x, t.y - y) < 45)) continue;
  if (trees.some((tree) => Math.hypot(tree.x - x, tree.y - y) < 48)) continue;
  trees.push({ x, y, size: 72 + Math.floor(random() * 25), radius: 15 });
}
export const TREES: readonly Readonly<Tree>[] = Object.freeze(
  trees.map((tree) => Object.freeze(tree)),
);

/** Circle-body movement for players and enemies; coordinates are at their feet. */
export function moveActor(
  position: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  collide = true,
) {
  if (!collide)
    return {
      x: wrap(position.x + dx, ARENA.width),
      y: wrap(position.y + dy, ARENA.height),
    };
  let { x, y } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 2)));
  // ponytail: scan this small fixed grove; index obstacles spatially when maps grow.
  const clear = (px: number, py: number) =>
    TREES.every(
      (tree) =>
        Math.hypot(
          wrappedDelta(px, tree.x, ARENA.width),
          wrappedDelta(py, tree.y - 8, ARENA.height),
        ) >=
        radius + tree.radius,
    ) &&
    Math.hypot(px - WARDROBE.x, py - WARDROBE.y) >= radius + 18 &&
    TORCHES.every((t) => Math.hypot(px - t.x, py - t.y) >= radius + 5) &&
    BUILDINGS.every(
      (b) =>
        Math.hypot(
          px - Math.max(b.x - b.sourceWidth + 8, Math.min(b.x + b.sourceWidth - 8, px)),
          py - Math.max(b.y - 40, Math.min(b.y, py)),
        ) >= radius,
    );
  for (let i = 0; i < steps; i++) {
    const nextX = wrap(x + dx / steps, ARENA.width);
    if (clear(nextX, y)) x = nextX;
    const nextY = wrap(y + dy / steps, ARENA.height);
    if (clear(x, nextY)) y = nextY;
  }
  return { x, y };
}
