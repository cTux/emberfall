import {
  FOREST,
  LOBBY_PORTAL,
  FOREST_PORTAL,
  INTERACTION_RADIUS,
  FOREST_DEFINITION,
} from "./definitions/worlds/forest.ts";
export { FOREST, LOBBY_PORTAL, FOREST_PORTAL, INTERACTION_RADIUS };
import { BUILDINGS, WARDROBE } from "./world.ts";

export { WARDROBE } from "./world.ts";

export const wrap = (n: number, size: number) =>
  n >= 0 && n < size ? n : ((n % size) + size) % size;
export const wrappedDelta = (a: number, b: number, size: number) =>
  wrap(a - b + size / 2, size) - size / 2;
export const forestDistance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(wrappedDelta(a.x, b.x, FOREST.width), wrappedDelta(a.y, b.y, FOREST.height));

// One deterministic trunk per grid cell; collision and rendering query only nearby cells.
export function forestTrees(x: number, y: number, radius: number) {
  const trees: { id: string; x: number; y: number; size: number; radius: number }[] = [];
  for (
    let row = Math.floor((y - radius) / FOREST_DEFINITION.treeCellSize);
    row <= Math.floor((y + radius) / FOREST_DEFINITION.treeCellSize);
    row++
  ) {
    for (
      let col = Math.floor((x - radius) / FOREST_DEFINITION.treeCellSize);
      col <= Math.floor((x + radius) / FOREST_DEFINITION.treeCellSize);
      col++
    ) {
      const c = wrap(col, FOREST.width / FOREST_DEFINITION.treeCellSize),
        r = wrap(row, FOREST.height / FOREST_DEFINITION.treeCellSize);
      let seed = (Math.imul(c + 17, 73856093) ^ Math.imul(r + 31, 19349663)) >>> 0;
      const random = () => {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        return seed / 4294967296;
      };
      const tx = col * FOREST_DEFINITION.treeCellSize + 25 + random() * 110,
        ty = row * FOREST_DEFINITION.treeCellSize + 25 + random() * 110;
      if (forestDistance({ x: tx, y: ty }, FOREST_PORTAL) < 180) continue;
      trees.push({
        id: `forest:${c}:${r}`,
        x: tx,
        y: ty,
        size: 78 + random() * 28,
        radius: FOREST_DEFINITION.treeRadius,
      });
    }
  }
  return trees;
}
export function moveForestActor(
  position: { x: number; y: number },
  dx: number,
  dy: number,
  radius: number,
  collide = true,
) {
  if (!collide)
    return { x: wrap(position.x + dx, FOREST.width), y: wrap(position.y + dy, FOREST.height) };
  let { x, y } = position;
  const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / Math.max(1, radius / 2)));
  for (let i = 0; i < steps; i++) {
    const trees = forestTrees(x, y, 40);
    const clear = (px: number, py: number) =>
      // Owner-position spawns must be able to escape a trunk they already overlap.
      trees.every(
        (t) =>
          Math.hypot(px - t.x, py - t.y) >=
          Math.min(radius + t.radius, Math.hypot(x - t.x, y - t.y)),
      );
    if (clear(x + dx / steps, y)) x += dx / steps;
    if (clear(x, y + dy / steps)) y += dy / steps;
  }
  return { x: wrap(x, FOREST.width), y: wrap(y, FOREST.height) };
}
export function nearbyInteraction(
  player: { x: number; y: number; scene?: string; hitpoints: number },
  ended = false,
  portals: { x: number; y: number }[] = [FOREST_PORTAL],
) {
  if (player.hitpoints <= 0) return null;
  if (player.scene === "forest") {
    const portal = portals.find((p) => forestDistance(player, p) < INTERACTION_RADIUS);
    return ended && portal ? { id: "return", name: "Return to village", ...portal } : null;
  }
  const distance = (point: { x: number; y: number }) =>
    forestDistance({ x: player.x, y: player.y + 15 }, point);
  if (distance(LOBBY_PORTAL) < INTERACTION_RADIUS)
    return { id: "portal", name: "Forest portal", ...LOBBY_PORTAL };
  if (distance(WARDROBE) < 55) return { id: "wardrobe", name: "Wardrobe", ...WARDROBE };
  const building = BUILDINGS.find(
    (b) => distance({ x: b.doorX, y: b.y + 24 }) < INTERACTION_RADIUS,
  );
  return building
    ? { id: building.id, name: building.name, x: building.doorX, y: building.y }
    : null;
}
export type DebuffKind = "bleed" | "poison" | "burn" | "roots";
export interface Debuff {
  kind: DebuffKind;
  stacks: number;
  expiresAt: number;
  nextTick: number;
  ownerId: string;
}
export interface PlayerShot {
  id: number;
  castAt?: number;
  castId?: number;
  ownerId: string;
  kind: "arrow" | "fireball" | "roots";
  x: number;
  y: number;
  angle: number;
  remaining: number;
  hitIds: number[];
  targetId?: number;
  targetX?: number;
  targetY?: number;
}
export interface Enemy {
  maxHitpoints?: number;
  debuffs?: Debuff[];
  name?: string;
  archetype?: "skeleton" | "runner" | "brute" | "caster";
  attack?: {
    startedAt: number;
    endsAt: number;
    x: number;
    y: number;
    radius: number;
    ranged: boolean;
  };
  cooldownUntil?: number;
  kind?: "normal" | "elite" | "boss";
  id: number;
  x: number;
  y: number;
  hitpoints: number;
  angle: number;
}
export interface DamageEvent {
  ownerId?: string;
  damageType?: import("./definitions/equipment.ts").DamageType;
  critical?: boolean;
  enemy?: Pick<Enemy, "archetype" | "kind" | "angle">;
  killed?: boolean;
  id: number;
  x: number;
  y: number;
  amount: number;
  at: number;
  target: string;
}
export interface LootDrop {
  /** Server-selected attraction target; presentation may attach to its reconciled pose. */
  collectorId?: string;
  amount?: number;
  id: number;
  kind: "experience" | "gold";
  x: number;
  y: number;
  at: number;
}
export interface SceneState {
  playerCount?: number;
  training?: boolean;
  pausedAt?: number;
  playerShots?: PlayerShot[];
  explosions?: { id: number; x: number; y: number; at: number }[];
  drops?: LootDrop[];
  spawns?: (Enemy & { spawnsAt: number; warnedAt: number })[];
  projectiles?: { id: number; x: number; y: number; vx: number; vy: number; expiresAt: number }[];
  bossId?: number;
  spawnCount?: number;
  portals: { x: number; y: number }[];
  sequence: number;
  nextSpawn: number;
  id: string;
  type: "Forest";
  difficulty: "Easy";
  phase: "voting" | "countdown" | "active" | "ended";
  ready: string[];
  countdownAt: number | null;
  endsAt: number | null;
  enemies: Enemy[];
  damage: DamageEvent[];
}
export function hasLivingScenePlayers(players: Iterable<{ scene?: string; hitpoints: number }>) {
  return [...players].some((p) => p.scene === "forest" && p.hitpoints > 0);
}
