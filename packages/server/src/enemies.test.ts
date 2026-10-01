import { test } from "node:test";
import assert from "node:assert/strict";
import { forestTrees, forestDistance, FOREST, stepCombat } from "@emberfall/common";
import type { Player, Enemy, SceneState } from "@emberfall/common";
import { moveEnemies } from "../../common/src/enemies.ts";

const player = (x: number, y: number): Player => ({
  id: "p",
  name: "p",
  x,
  y,
  scene: "forest",
  hitpoints: 100,
  maxHitpoints: 100,
  manapoints: 50,
  maxManapoints: 50,
  level: 1,
  experience: 0,
  playtimeSeconds: 0,
  color: 0,
  attackAt: 1e9,
});
const enemy = (id: number, x: number, y: number): Enemy => ({ id, x, y, hitpoints: 10, angle: 0 });

test("melee windup can be dodged and ranged attacks launch visible, colliding projectiles", () => {
  const p = player(2400, 1280);
  const scene: SceneState = {
    id: "s",
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: 1e9,
    nextSpawn: 1e9,
    sequence: 0,
    damage: [],
    portals: [],
    enemies: [enemy(1, 2430, 1280)],
  };
  stepCombat(scene, [p], 10000, 0);
  assert(scene.enemies[0].attack);
  stepCombat(scene, [p], 10649, 0);
  assert.equal(p.hitpoints, 100);
  p.x = 2300;
  stepCombat(scene, [p], 10650, 0);
  assert.equal(p.hitpoints, 100);
  assert.equal(scene.enemies[0].attack, undefined);
  const x = scene.enemies[0].x;
  stepCombat(scene, [p], 10700, 0.05);
  assert(scene.enemies[0].x < x);
  scene.enemies = [{ ...enemy(2, 2400, 1280), archetype: "caster" }];
  p.x = 2520;
  stepCombat(scene, [p], 12000, 0);
  assert(scene.enemies[0].attack?.ranged);
  stepCombat(scene, [p], 12899, 0);
  assert.equal(scene.projectiles!.length, 0);
  stepCombat(scene, [p], 12900, 0);
  assert.equal(scene.projectiles!.length, 1);
  p.y = 1350;
  for (let i = 1; i <= 12; i++) stepCombat(scene, [p], 12900 + i * 50, 0.05);
  assert.equal(p.hitpoints, 100);
  p.y = 1280;
  scene.projectiles = [{ id: 99, x: p.x - 20, y: p.y, vx: 210, vy: 0, expiresAt: 20000 }];
  stepCombat(scene, [p], 14000, 0.1);
  assert.equal(p.hitpoints, 90);
  assert.equal(scene.projectiles.length, 0);
});

test("spawn warnings last a full second and small enemies move faster than brutes", () => {
  const p = player(2400, 1280);
  const scene: SceneState = {
    id: "s",
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: 1e9,
    nextSpawn: 0,
    sequence: 0,
    damage: [],
    portals: [],
    enemies: [],
  };
  stepCombat(scene, [p], 10000, 0);
  scene.nextSpawn = 1e9;
  assert.equal(scene.enemies.length, 0);
  assert.equal(scene.spawns!.length, 1);
  stepCombat(scene, [p], 10999, 0);
  assert.equal(scene.enemies.length, 0);
  stepCombat(scene, [p], 11000, 0);
  assert.equal(scene.enemies.length, 1);
  assert.equal(scene.spawns!.length, 0);
  const runner = { ...enemy(1, 2300, 1280), archetype: "runner" as const };
  const brute = { ...enemy(2, 2300, 1280), archetype: "brute" as const };
  moveEnemies([runner], [p], 0.05);
  moveEnemies([brute], [p], 0.05);
  assert(runner.x - 2300 > (brute.x - 2300) * 2);
});

test("enemies detour around a trunk from both sides and keep solid bodies", () => {
  const tree = forestTrees(400, 400, 100)[0];
  for (const id of [1, 2]) {
    const e = enemy(id, tree.x - 70, tree.y - 15);
    const target = player(tree.x + 70, tree.y - 15);
    for (let tick = 0; tick < 160; tick++) {
      moveEnemies([e], [target], 0.05);
      assert(Math.hypot(e.x - tree.x, e.y + 15 - tree.y) >= 25 - 1e-8);
    }
    assert(forestDistance(e, target) < 10, `enemy ${id} must get past the tree`);
  }
  const enemies = Array.from({ length: 16 }, (_, i) =>
    enemy(i, 2300 + (i % 4) * 24, 1200 + Math.floor(i / 4) * 24),
  );
  for (let tick = 0; tick < 120; tick++) {
    moveEnemies(enemies, [player(2400, 1280)], 0.05);
    for (const a of enemies)
      for (const b of enemies)
        if (a.id !== b.id)
          assert(forestDistance(a, b) >= 20 - 1e-8, "crowd bodies must not overlap");
  }
});

test("chase selects nearest living player, retargets, and respects wrapped crowd collisions", () => {
  const e = enemy(1, 2, 1280);
  const far = player(300, 1280),
    near = player(FOREST.width - 30, 1280);
  moveEnemies([e], [far, near], 0.05);
  assert(forestDistance(e, near) < 32);
  near.hitpoints = 0;
  const before = forestDistance(e, far);
  moveEnemies([e], [far, near], 0.05);
  assert(forestDistance(e, far) < before);
  const crowd = [enemy(1, 2, 1280), enemy(2, FOREST.width - 20, 1280)];
  for (let i = 0; i < 50; i++) {
    moveEnemies(crowd, [player(FOREST.width - 40, 1280)], 0.05);
    assert(forestDistance(crowd[0], crowd[1]) >= 20 - 1e-8);
  }
});

test("every tenth successful spawn is a 50 HP elite; timer spawns only one 200 HP boss", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const scene: SceneState = {
    id: "s",
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: 120000,
    nextSpawn: 0,
    sequence: 0,
    enemies: [],
    damage: [],
    portals: [],
  };
  const p = player(2400, 1280);
  for (let now = 1000; (scene.spawnCount ?? 0) < 20 && now < 50000; now += 400) {
    stepCombat(scene, [p], now, 0);
  }
  assert.equal(scene.spawnCount, 20);
  const elites = [...scene.enemies, ...scene.spawns!].filter((e) => e.kind === "elite");
  assert.equal(elites.length, 2);
  assert(elites.every((e) => e.hitpoints === 50));
  stepCombat(scene, [p], 120000, 0);
  assert.equal(
    scene.enemies.some((e) => e.kind === "boss"),
    false,
  );
  assert.equal(scene.spawns!.find((e) => e.kind === "boss")?.hitpoints, 200);
  stepCombat(scene, [p], 121000, 0);
  const count = scene.enemies.length;
  assert.equal(scene.enemies.find((e) => e.kind === "boss")?.hitpoints, 200);
  stepCombat(scene, [p], 122000, 0);
  assert(scene.enemies.length > count, "regular enemies keep spawning while the boss is alive");
  assert.equal([...scene.enemies, ...scene.spawns!].filter((e) => e.kind === "boss").length, 1);
  assert.equal(scene.phase, "active");
  assert.equal(scene.portals.length, 0);
});
