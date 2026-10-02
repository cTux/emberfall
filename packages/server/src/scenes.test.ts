import { test } from "node:test";
import assert from "node:assert/strict";
import {
  FOREST,
  ARENA,
  LOBBY_PORTAL,
  forestTrees,
  moveForestActor,
  forestDistance,
  nearbyInteraction,
  CLASS_IDS,
} from "@emberfall/common";
import type { Player } from "@emberfall/common";
import { sceneAction, tickScene, reconcileVote } from "./scenes.ts";
import type { SceneWorld } from "./scenes.ts";
const hero = (id: string): Player => ({
  id,
  name: id,
  x: LOBBY_PORTAL.x,
  y: LOBBY_PORTAL.y - 15,
  color: 0,
  level: 1,
  experience: 0,
  hitpoints: 100,
  maxHitpoints: 100,
  manapoints: 50,
  maxManapoints: 50,
  playtimeSeconds: 0,
});

test("every scene exit restores all classes and injured or dead companions to their maximum stats", () => {
  for (const exit of ["portal", "death", "leave"] as const) {
    for (const bearHealth of [0, 7]) {
      const players = CLASS_IDS.map((classId) => ({ ...hero(classId), classId }));
      const world: SceneWorld = { players: new Map(players.map((p) => [p.id, p])) };
      sceneAction(
        world,
        players[0],
        { type: "createScene", scene: "Forest", difficulty: "Easy" },
        10000,
      );
      for (const player of players)
        sceneAction(world, player, { type: "ready", ready: true }, 10000);
      tickScene(world, 15000, 0);
      const scene = world.scene!;
      if (exit === "portal") {
        scene.phase = "ended";
        scene.portals = players.map((p) => ({ x: p.x, y: p.y }));
      }
      for (const player of players) {
        player.maxHitpoints = 120;
        player.maxManapoints = 80;
        player.hitpoints = exit === "death" ? 0 : 12;
        player.manapoints = 0;
        if (player.bear) {
          player.bear.maxHitpoints = 180;
          player.bear.hitpoints = bearHealth;
          player.bear.resurrectAt = bearHealth === 0 ? 20000 : undefined;
        }
      }
      for (const player of players) {
        sceneAction(
          world,
          player,
          { type: exit === "leave" ? "leaveScene" : "returnLobby" },
          15001,
        );
        assert.equal(player.scene, undefined);
        assert.equal(player.hitpoints, 120);
        assert.equal(player.manapoints, 80);
        if (player.bear) {
          assert.equal(player.bear.hitpoints, 180);
          assert.equal(player.bear.resurrectAt, undefined);
          assert.equal(player.bear.x, player.x);
          assert.equal(player.bear.y, player.y);
        }
      }
      assert.equal(world.scene, undefined);
      tickScene(world, 15002, 0);
      assert.equal(players.at(-1)!.bear!.hitpoints, 180);
    }
  }
});

test("server scene lifecycle: proximity, unanimous votes, retract, membership changes, combat, death and boss-gated return", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const a = hero("a"),
    b = hero("b");
  const world: SceneWorld = {
    players: new Map([
      [a.id, a],
      [b.id, b],
    ]),
  };
  a.x = 10;
  assert.throws(() =>
    sceneAction(world, a, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 10000),
  );
  a.x = LOBBY_PORTAL.x;
  sceneAction(world, a, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 10000);
  assert.equal(world.scene?.phase, "voting");
  assert.equal(a.scene, undefined);
  assert.throws(() =>
    sceneAction(world, a, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 10000),
  );
  sceneAction(world, a, { type: "ready", ready: true }, 10000);
  assert.equal(world.scene?.countdownAt, null);
  sceneAction(world, b, { type: "ready", ready: true }, 10000);
  assert.equal(world.scene?.countdownAt, 15000);
  tickScene(world, 14999, 0.05);
  assert.equal(a.scene, undefined);
  sceneAction(world, a, { type: "ready", ready: false }, 14999);
  tickScene(world, 16000, 0.05);
  assert.equal(world.scene?.phase, "voting");
  sceneAction(world, a, { type: "ready", ready: true }, 17000);
  assert.equal(world.scene?.countdownAt, 22000);
  const c = hero("c");
  world.players.set("c", c);
  reconcileVote(world, 18000);
  assert.equal(world.scene?.countdownAt, null);
  world.players.delete("c");
  reconcileVote(world, 19000);
  assert.equal(world.scene?.countdownAt, 24000);
  tickScene(world, 24000, 0.05);
  assert.equal(a.scene, "forest");
  assert.equal(b.scene, "forest");
  assert.equal(world.scene?.endsAt, 144000);
  const scene = world.scene!;
  scene.nextSpawn = Infinity;
  scene.spawns = [];
  scene.enemies = [{ id: 999, x: a.x + 45, y: a.y, hitpoints: 10, angle: 0 }];
  a.attackAt = 24000;
  b.attackAt = 30000;
  tickScene(world, 24700, 0);
  assert.equal(scene.enemies[0].hitpoints, 5);
  tickScene(world, 25400, 0);
  assert.equal(scene.enemies.length, 0);
  assert.equal(a.experience, 1);
  assert.throws(() => sceneAction(world, a, { type: "returnLobby" }, 26000));
  a.hitpoints = 10;
  a.attackAt = 30000;
  scene.enemies = [{ id: 1000, x: a.x, y: a.y, hitpoints: 10, angle: 0 }];
  tickScene(world, 27000, 0);
  assert.equal(a.hitpoints, 10);
  tickScene(world, 27650, 0);
  assert.equal(a.hitpoints, 0);
  assert.equal(b.scene, "forest");
  sceneAction(world, a, { type: "returnLobby" }, 28000);
  assert.equal(a.scene, undefined);
  assert.equal(a.hitpoints, 100);
  assert.equal(scene.phase, "active");
  tickScene(world, 143999, 0);
  assert.equal(scene.phase, "active");
  tickScene(world, 144000, 0);
  assert.equal(scene.phase, "active");
  assert.equal(scene.portals.length, 0);
  assert(scene.spawns?.some((e) => e.kind === "boss"));
  tickScene(world, 145000, 0);
  const boss = scene.enemies.find((e) => e.kind === "boss")!;
  assert.equal(boss.hitpoints, 200);
  assert.equal(scene.bossId, boss.id);
  assert.throws(() => sceneAction(world, b, { type: "returnLobby" }, 144001));
  b.x = boss.x - 70;
  b.y = boss.y;
  for (let hit = 1; hit <= 39; hit++) tickScene(world, 145000 + hit * 700, 0);
  assert.equal(scene.phase, "active");
  assert.equal(boss.hitpoints, 5);
  assert.equal(scene.enemies.filter((e) => e.kind === "boss").length, 1);
  tickScene(world, 173000, 0);
  assert.equal(scene.phase, "ended");
  assert.equal(scene.enemies.length, 0);
  const returnPosition = { x: b.x, y: b.y };
  b.x = 10;
  b.y = 10;
  assert.throws(() => sceneAction(world, b, { type: "returnLobby" }, 144001));
  Object.assign(b, returnPosition);
  assert.equal(nearbyInteraction(b, true, scene.portals)?.id, "return");
  sceneAction(world, b, { type: "returnLobby" }, 144002);
  assert.equal(world.scene, undefined);
});
test("forest has 20x area; all edges wrap; indexed trunks stop players and enemies including seam copies", () => {
  assert.equal(FOREST.width * FOREST.height, 20 * ARENA.width * ARENA.height);
  // Known clear crossing lines isolate wrapping from obstacle collisions.
  for (const [x, y, dx, dy] of [
    [2, 1280, -8, 0],
    [4798, 1280, 8, 0],
    [2400, 2, 0, -8],
    [2400, 2558, 0, 8],
  ]) {
    const moved = moveForestActor({ x, y }, dx, dy, 12);
    assert(forestDistance(moved, { x: x + dx, y: y + dy }) < 0.001);
    assert(moved.x >= 0 && moved.x < FOREST.width && moved.y >= 0 && moved.y < FOREST.height);
  }
  const tree = forestTrees(400, 400, 100)[0];
  for (const radius of [10, 12]) {
    const moved = moveForestActor({ x: tree.x - 60, y: tree.y }, 120, 0, radius);
    assert(moved.x <= tree.x - tree.radius - radius);
    assert(moved.x > tree.x - 60);
  }
  const left = forestTrees(0, 200, 200),
    right = forestTrees(FOREST.width, 200, 200);
  assert.deepEqual(
    left.map((t) => t.id),
    right.map((t) => t.id),
  );
});

test("combat uses wrapped distances and warned melee damage respects its cooldown", () => {
  const a = hero("a");
  const world: SceneWorld = { players: new Map([[a.id, a]]) };
  sceneAction(world, a, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 10000);
  sceneAction(world, a, { type: "ready", ready: true }, 10000);
  tickScene(world, 15000, 0);
  const scene = world.scene!;
  scene.nextSpawn = Infinity;
  scene.spawns = [];
  a.x = 2;
  a.y = 1280;
  a.attackAt = 15000;
  a.attackAngle = Math.PI; // Face across the seam; this test isolates wrapped hit detection.
  scene.enemies = [{ id: 999, x: FOREST.width - 20, y: 1280, hitpoints: 10, angle: 0 }];
  tickScene(world, 15700, 0);
  assert.equal(scene.enemies[0].hitpoints, 5);
  assert.equal(a.hitpoints, 100);
  a.attackAt = 20000;
  tickScene(world, 16350, 0);
  assert.equal(a.hitpoints, 90);
  tickScene(world, 16400, 0);
  assert.equal(a.hitpoints, 90);
  a.attackAt = 20000;
  tickScene(world, 17350, 0);
  assert.equal(a.hitpoints, 90);
  tickScene(world, 18000, 0);
  assert.equal(a.hitpoints, 80);
  sceneAction(world, a, { type: "leaveScene" }, 16800);
  assert.equal(a.scene, undefined);
  assert.equal(world.scene, undefined);
});
