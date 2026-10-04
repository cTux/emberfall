import { test } from "node:test";
import assert from "node:assert/strict";
import { worldHitboxes, drawHitboxes, HITBOX_COLORS } from "../packages/client-new/src/hitboxes.ts";
import {
  createTrainingScene,
  ENEMY_STATS,
  FOREST,
  type WorldState,
} from "../packages/common-new/src/index.ts";
import { loadPreferences } from "../packages/client-new/src/preferences.ts";

test("debug setting defaults off and only accepts saved booleans", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    for (const [saved, expected] of [
      ["{}", false],
      ['{"debugHitboxes":true}', true],
      ['{"debugHitboxes":"true"}', false],
      ["null", false],
      ["bad JSON", false],
    ] as const) {
      Object.defineProperty(globalThis, "localStorage", {
        configurable: true,
        value: { getItem: () => saved },
      });
      assert.equal(loadPreferences().debugHitboxes, expected);
    }
  } finally {
    if (original) Object.defineProperty(globalThis, "localStorage", original);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});

test("all enemy archetypes, both projectile sides and pickup ranges use rule geometry", () => {
  const scene = createTrainingScene(1000);
  scene.training = false;
  scene.enemies = Object.keys(ENEMY_STATS).map((archetype, id) => ({
    id,
    archetype: archetype as keyof typeof ENEMY_STATS,
    x: 100 + id * 50,
    y: 100,
    angle: 0,
    kind: "normal",
    hitpoints: 10,
  }));
  scene.playerShots = ["arrow", "fireball", "roots"].map((kind, id) => ({
    id,
    kind: kind as "arrow" | "fireball" | "roots",
    ownerId: "p",
    x: id * 30,
    y: 150,
    angle: 0,
    remaining: 100,
    hitIds: [],
  }));
  scene.projectiles = [{ id: 9, x: 200, y: 200, vx: 0, vy: 0, expiresAt: 2000 }];
  scene.drops = [{ id: 10, x: 200, y: 300, kind: "gold", at: 1000 }];
  const world: WorldState = { id: "w", hostId: "p", name: "test", players: [], scene };
  const shapes = worldHitboxes(world, true, { x: 0, y: 0, width: 500, height: 500 });
  assert.deepEqual(
    shapes.filter((s) => s.color === HITBOX_COLORS.body).map((s) => "radius" in s && s.radius),
    [10, 8, 16, 10],
  );
  assert.deepEqual(
    shapes
      .filter((s) => s.color === HITBOX_COLORS.projectile)
      .map((s) => "radius" in s && s.radius),
    [4, 4, 4, 5],
  );
  assert(shapes.some((s) => s.label === "collect" && "radius" in s && s.radius === 22));
  assert(shapes.some((s) => s.label === "feet" && s.y === 115));
});

test("overlay projects a hitbox across the wrapped seam and restores drawing state", () => {
  const scene = createTrainingScene(1000);
  scene.enemies = [{ id: 1, x: FOREST.width - 3, y: 100, hitpoints: 10, angle: 0, kind: "normal" }];
  const world: WorldState = { id: "w", hostId: "p", name: "test", players: [], scene };
  const arcs: number[][] = [];
  let saves = 0,
    restores = 0;
  const ctx = {
    save() {
      saves++;
    },
    restore() {
      restores++;
    },
    beginPath() {},
    stroke() {},
    fillText() {},
    rect() {},
    arc(...args: number[]) {
      arcs.push(args);
    },
  };
  drawHitboxes(ctx as unknown as CanvasRenderingContext2D, world, true, {
    x: -100,
    y: 0,
    width: 200,
    height: 200,
  });
  assert(arcs.some(([x, y, radius]) => x === -3 && y === 100 && radius === 10));
  assert.equal(saves, restores);
});
