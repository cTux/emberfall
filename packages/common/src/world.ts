export const ARENA = { width: 960, height: 640, speed: 180 } as const;
export const WARDROBE = { x: 350, y: 365 };
export const BUILDINGS = [
  { id: "inn", name: "Inn", x: 235, y: 225, sourceX: 0, sourceWidth: 64 },
  { id: "hall", name: "Hall", x: 485, y: 170, sourceX: 192, sourceWidth: 64 },
  { id: "workshop", name: "Workshop", x: 735, y: 235, sourceX: 304, sourceWidth: 64 },
  { id: "storehouse", name: "Storehouse", x: 240, y: 510, sourceX: 128, sourceWidth: 64 },
  { id: "lodge", name: "Lodge", x: 730, y: 510, sourceX: 256, sourceWidth: 48 },
] as const;
export const PATHS = [
  [
    { x: 350, y: 405 },
    { x: 480, y: 405 },
    { x: 480, y: 355 },
  ],
  [
    { x: 235, y: 240 },
    { x: 235, y: 280 },
    { x: 480, y: 280 },
    { x: 480, y: 355 },
  ],
  [
    { x: 485, y: 185 },
    { x: 485, y: 280 },
  ],
  [
    { x: 735, y: 250 },
    { x: 735, y: 280 },
    { x: 480, y: 280 },
  ],
  [
    { x: 480, y: 355 },
    { x: 480, y: 550 },
    { x: 240, y: 550 },
    { x: 240, y: 525 },
  ],
  [
    { x: 480, y: 550 },
    { x: 730, y: 550 },
    { x: 730, y: 525 },
  ],
] as const;
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
for (let i = 0; i < 110; i++) {
  const x = 35 + random() * 890;
  const y = 55 + random() * 555;
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
) {
  let { x, y } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 2)));
  // ponytail: scan this small fixed grove; index obstacles spatially when maps grow.
  const clear = (px: number, py: number) =>
    TREES.every((tree) => Math.hypot(px - tree.x, py - (tree.y - 8)) >= radius + tree.radius) &&
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
    const nextX = Math.max(radius, Math.min(ARENA.width - radius, x + dx / steps));
    if (clear(nextX, y)) x = nextX;
    const nextY = Math.max(radius, Math.min(ARENA.height - radius, y + dy / steps));
    if (clear(x, nextY)) y = nextY;
  }
  return { x, y };
}
