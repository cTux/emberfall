import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ARENA,
  BUILDINGS,
  TORCHES,
  WARDROBE,
  TREES,
  FOREST,
  forestTrees,
  movePlayer,
  moveActor,
  moveForestActor,
  tickCompanion,
  forestDistance,
} from "@emberfall/common-new";
import type { Player, WorldState } from "@emberfall/common-new";
import { LocalMovement } from "../../client-new/src/local-movement.ts";
import { SnapshotBuffer } from "../../client-new/src/snapshots.ts";

test("server movement, prediction and interpolation pass through every scenery kind", async () => {
  const obstacles = [
    ...BUILDINGS,
    ...TORCHES,
    WARDROBE,
    ...TREES.map((tree) => ({ ...tree, y: tree.y - 8 })),
    ...forestTrees(400, 400, 100).map((tree) => ({ ...tree, scene: "forest" })),
  ];
  for (const obstacle of obstacles) {
    for (const [dx, dy] of [
      [90, 0],
      [-90, 0],
      [0, 90],
      [0, -90],
    ]) {
      const player = {
        id: "p",
        x: obstacle.x - dx / 2,
        y: obstacle.y - 15 - dy / 2,
        hitpoints: 100,
        scene: "scene" in obstacle ? obstacle.scene : undefined,
      } as Player;
      if (
        !player.scene &&
        (Math.min(player.x, player.x + dx) < 12 ||
          Math.max(player.x, player.x + dx) > ARENA.width - 12 ||
          Math.min(player.y, player.y + dy) + 15 < 12 ||
          Math.max(player.y, player.y + dy) + 15 > ARENA.height - 12)
      )
        continue;
      const world: WorldState = {
        id: "room",
        name: "Pass-through",
        hostId: "p",
        serverNow: 10000,
        players: [player],
        scene: player.scene
          ? {
              id: "forest",
              type: "Forest",
              difficulty: "Easy",
              phase: "active",
              enemies: [],
              portals: [],
              damage: [],
              ready: [],
              sequence: 0,
              nextSpawn: 0,
              countdownAt: null,
              endsAt: null,
            }
          : undefined,
      };
      const expected = { x: player.x + dx, y: player.y + dy };
      const server = { ...player };
      movePlayer(server, dx / 90, dy / 90, 0.5);
      assert(Math.abs(server.x - expected.x) < 1e-9);
      assert(Math.abs(server.y - expected.y) < 1e-9);
      const local = new LocalMovement("p", () => {});
      local.render(world, 0);
      local.input(dx / 90, dy / 90, 0);
      for (let now = 50; now <= 500; now += 50) local.render(world, now);
      const predicted = local.render(world, 500)!;
      assert(Math.abs(predicted.x - expected.x) < 1e-9);
      assert(Math.abs(predicted.y - expected.y) < 1e-9);
      const buffer = new SnapshotBuffer("p");
      buffer.push(world, 0);
      buffer.render(0);
      buffer.push({ ...world, serverNow: 10100, players: [server] }, 100);
      const middle = buffer.render(100)!;
      const alpha = (middle.serverNow! - 10000) / 100;
      assert(alpha > 0 && alpha < 1);
      assert(Math.abs(middle.players[0].x - (player.x + dx * alpha)) < 1e-9);
      assert(Math.abs(middle.players[0].y - (player.y + dy * alpha)) < 1e-9);
      const arrived = buffer.render(500)!.players[0];
      assert(Math.abs(arrived.x - expected.x) < 1e-9);
      assert(Math.abs(arrived.y - expected.y) < 1e-9);
    }
  }
});

test("pass-through preserves wrapping in both areas, speed and death rules", async () => {
  const player = { x: 420, y: 340, hitpoints: 100 } as Player;
  movePlayer(player, 1, 1, 0.1);
  assert(Math.abs(Math.hypot(player.x - 420, player.y - 340) - ARENA.speed * 0.1) < 1e-9);
  movePlayer(player, 1, 1, 100);
  assert(player.x >= 0 && player.x < ARENA.width);
  assert(player.y >= 0 && player.y < ARENA.height);
  movePlayer(player, -1, -1, 100);
  assert(Math.abs(player.x - (420 + 18 / Math.sqrt(2))) < 1e-9);
  assert(Math.abs(player.y - (340 + 18 / Math.sqrt(2))) < 1e-9);
  for (const scene of [undefined, "forest"] as const) {
    player.scene = scene;
    for (const [x, y, dx, dy] of [
      [2, 1280, -1, 0],
      [FOREST.width - 2, 1280, 1, 0],
      [2400, 2, 0, -1],
      [2400, FOREST.height - 2, 0, 1],
    ]) {
      Object.assign(player, { x, y });
      movePlayer(player, dx, dy, 0.1);
      assert.equal(player.x, (x + dx * 18 + FOREST.width) % FOREST.width);
      assert.equal(player.y, (y + dy * 18 + FOREST.height) % FOREST.height);
    }
  }
  player.hitpoints = 0;
  const dead = { ...player };
  movePlayer(player, 1, 1, 1);
  assert.deepEqual(player, dead);
});

test("companion escapes owner-position spawns inside trees without disabling tree collision", () => {
  for (const forest of [false, true]) {
    const tree = forest ? forestTrees(400, 400, 100)[0] : TREES[0];
    const cy = forest ? tree.y : tree.y - 8;
    const move = forest ? moveForestActor : moveActor;
    const center = { x: tree.x, y: cy };
    const escaped = move(center, 80, 0, 12);
    assert(escaped.x > center.x + tree.radius + 12, "initial overlap must allow escape");
    const blocked = move({ x: center.x - 80, y: cy }, 160, 0, 12);
    assert(blocked.x <= center.x - tree.radius - 12, "new entry must remain blocked");
    const p = {
      id: "druid",
      classId: "druid",
      x: center.x,
      y: cy - 15,
      hitpoints: 100,
      maxHitpoints: 100,
      scene: forest ? "forest" : undefined,
    } as Player;
    tickCompanion(p, undefined, 10000, 0);
    p.x += 600;
    tickCompanion(p, undefined, 10050, 0);
    p.x = center.x;
    tickCompanion(p, undefined, 10100, 0);
    assert.equal(p.bear!.x, center.x, "teleport must use the owner position");
    p.x += 60;
    for (let now = 10150; now <= 14100; now += 50) tickCompanion(p, undefined, now, 0.05);
    assert(forestDistance(p.bear!, p) <= 20.01, "teleported companion must resume following");
  }
});
