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
  FOREST_PORTAL,
} from "@emberfall/common";
import type { Player } from "@emberfall/common";
import { sceneAction, tickScene, reconcileVote, sceneState } from "./scenes.ts";
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

test("system chat announces scene transitions and deaths exactly once", () => {
  const a = hero("a"),
    b = hero("b");
  const world: SceneWorld = {
    players: new Map([
      [a.id, a],
      [b.id, b],
    ]),
  };
  sceneAction(world, a, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 0);
  for (const player of [a, b]) sceneAction(world, player, { type: "ready", ready: true }, 0);
  tickScene(world, 5000, 0);
  assert.deepEqual(
    world.chat?.map((m) => m.text),
    [
      "a joined the scene. Everyone became stronger.",
      "b joined the scene. Everyone became stronger.",
    ],
  );
  const scene = world.scene!;
  scene.nextSpawn = Infinity;
  scene.enemies = [];
  scene.spawns = [];
  a.hitpoints = 1;
  scene.projectiles = [{ id: 99, x: a.x, y: a.y, vx: 0, vy: 0, expiresAt: 9000 }];
  tickScene(world, 6000, 0.05);
  assert.equal(a.hitpoints, 0);
  assert.equal(world.chat?.at(-1)?.text, "a died.");
  tickScene(world, 6050, 0.05);
  assert.equal(world.chat?.filter((m) => m.text === "a died.").length, 1);
  sceneAction(world, a, { type: "returnLobby" }, 6100);
  assert.equal(world.chat?.at(-1)?.text, "a left the scene. Everyone became weaker.");
  a.x = LOBBY_PORTAL.x;
  a.y = LOBBY_PORTAL.y - 15;
  sceneAction(world, a, { type: "joinScene" }, 6200);
  assert.equal(world.chat?.at(-1)?.text, "a joined the scene. Everyone became stronger.");
  sceneAction(world, a, { type: "leaveScene" }, 6300);
  assert.equal(world.chat?.at(-1)?.text, "a left the scene. Everyone became weaker.");
  assert.throws(() => sceneAction(world, a, { type: "leaveScene" }, 6400));
  assert.equal(world.chat?.length, 6);
  b.hitpoints = 0;
  a.x = LOBBY_PORTAL.x;
  a.y = LOBBY_PORTAL.y - 15;
  sceneAction(world, a, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 6500);
  assert.equal(world.chat?.at(-1)?.text, "b left the scene. Everyone became weaker.");
  assert(world.chat?.every((m) => m.name === "System" && m.playerId === ""));
  assert(world.chat?.every((m) => m.excludedPlayerId === m.text[0]));
});

test("empty and dead scenes freeze combat deadlines, resume on entry, and can regenerate", () => {
  const a = hero("a"),
    b = hero("b");
  const world: SceneWorld = {
    players: new Map([
      [a.id, a],
      [b.id, b],
    ]),
  };
  sceneAction(world, a, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 0);
  for (const player of [a, b]) sceneAction(world, player, { type: "ready", ready: true }, 0);
  tickScene(world, 5000, 0);
  const scene = world.scene!;
  scene.nextSpawn = 6000;
  scene.enemies = [
    {
      id: 90,
      x: 2700,
      y: 1280,
      hitpoints: 100,
      angle: 0,
      cooldownUntil: 6000,
      attack: { startedAt: 5000, endsAt: 6000, x: 2700, y: 1280, radius: 40, ranged: true },
      debuffs: [{ kind: "burn", stacks: 1, nextTick: 6000, expiresAt: 10000, ownerId: a.id }],
    },
  ];
  scene.spawns = [
    { id: 91, x: 2900, y: 1280, hitpoints: 10, angle: 0, warnedAt: 5000, spawnsAt: 6000 },
  ];
  scene.projectiles = [{ id: 92, x: 2600, y: 1280, vx: 210, vy: 0, expiresAt: 7500 }];
  scene.drops = [{ id: 93, kind: "experience", x: 2600, y: 1280, at: 5000 }];
  scene.damage = [{ id: 94, x: 2700, y: 1280, target: "enemy:90", amount: 1, at: 5000 }];
  scene.explosions = [{ id: 95, x: 2700, y: 1280, at: 5000 }];
  scene.playerShots = [
    {
      id: 96,
      ownerId: a.id,
      kind: "arrow",
      x: 2400,
      y: 1280,
      angle: 0,
      remaining: 1000,
      hitIds: [],
    },
  ];
  a.hitpoints = 0;
  sceneAction(world, b, { type: "leaveScene" }, 5000);
  tickScene(world, 5000, 0.05);
  assert.equal(sceneState(scene)?.pausedAt, 5000);
  const frozen = structuredClone(scene);
  tickScene(world, 65000, 1);
  assert.deepEqual(scene, frozen, "a living village player and a corpse do not advance combat");
  b.x = LOBBY_PORTAL.x;
  b.y = LOBBY_PORTAL.y - 15;
  sceneAction(world, b, { type: "joinScene" }, 65000);
  tickScene(world, 65000, 0);
  assert.equal(scene.pausedAt, undefined);
  assert.equal(scene.endsAt, 185000);
  assert.equal(scene.nextSpawn, 66000);
  assert.equal(scene.enemies[0].attack?.endsAt, 66000);
  assert.equal(scene.enemies[0].cooldownUntil, 66000);
  assert.equal(scene.enemies[0].debuffs?.[0].nextTick, 66000);
  assert.equal(scene.enemies[0].debuffs?.[0].expiresAt, 70000);
  assert.equal(scene.spawns[0].spawnsAt, 66000);
  assert.equal(scene.spawns[0].warnedAt, 65000);
  assert.equal(scene.projectiles[0].expiresAt, 67500);
  assert.equal(scene.drops[0].at, 65000);
  assert.equal(scene.damage[0].at, 65000);
  assert.equal(scene.explosions[0].at, 65000);
  assert.equal(b.attackAt, 65000, "joining attacks use the current server clock");
  const c = hero("c");
  world.players.set(c.id, c);
  assert.throws(() =>
    sceneAction(world, c, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 65000),
  );
  sceneAction(world, b, { type: "leaveScene" }, 65000);
  a.hitpoints = 0;
  a.manapoints = 0;
  sceneAction(world, c, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 66000);
  assert.notEqual(world.scene!.id, scene.id);
  assert.equal(world.scene!.phase, "voting");
  assert.deepEqual(world.scene!.enemies, []);
  assert.deepEqual(world.scene!.ready, []);
  assert.equal(a.scene, undefined);
  assert.equal(a.hitpoints, a.maxHitpoints);
  assert.equal(a.manapoints, a.maxManapoints);
  for (const player of [a, b, c]) sceneAction(world, player, { type: "ready", ready: true }, 66000);
  tickScene(world, 71000, 0);
  for (const player of [a, b, c]) sceneAction(world, player, { type: "leaveScene" }, 71000);
  tickScene(world, 71000, 0);
  const empty = structuredClone(world.scene);
  tickScene(world, 200000, 1);
  assert.deepEqual(
    world.scene,
    empty,
    "an empty forest remains paused beyond its original deadline",
  );
  c.x = LOBBY_PORTAL.x;
  c.y = LOBBY_PORTAL.y - 15;
  sceneAction(world, c, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 200000);
  assert.notEqual(world.scene!.id, empty!.id);
});

test("players can join and rejoin an unfinished scene, but not after return portals open", () => {
  const a = hero("a");
  const world: SceneWorld = { players: new Map([[a.id, a]]) };
  assert.throws(() => sceneAction(world, a, { type: "joinScene" }, 0));
  sceneAction(world, a, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 0);
  assert.throws(() => sceneAction(world, a, { type: "joinScene" }, 0));
  sceneAction(world, a, { type: "ready", ready: true }, 0);
  assert.throws(() => sceneAction(world, a, { type: "joinScene" }, 1000));
  tickScene(world, 5000, 0);
  const scene = world.scene!;
  const b = hero("late");
  world.players.set(b.id, b);
  b.x = 10;
  assert.throws(() => sceneAction(world, b, { type: "joinScene" }, 6000));
  b.x = LOBBY_PORTAL.x;
  sceneAction(world, b, { type: "joinScene" }, 6000);
  assert.equal(b.scene, "forest");
  assert.equal(b.x, FOREST_PORTAL.x);
  assert.equal(b.y, FOREST_PORTAL.y);
  assert.equal(world.scene, scene);
  assert.equal(scene.endsAt, 125000);
  assert.throws(() => sceneAction(world, b, { type: "joinScene" }, 6001));
  sceneAction(world, a, { type: "leaveScene" }, 7000);
  sceneAction(world, b, { type: "leaveScene" }, 7000);
  assert.equal(world.scene, scene, "unfinished scenes stay joinable when the village is occupied");
  a.x = LOBBY_PORTAL.x;
  a.y = LOBBY_PORTAL.y;
  sceneAction(world, a, { type: "joinScene" }, 8000);
  scene.phase = "ended";
  scene.portals = [{ x: a.x, y: a.y }];
  b.x = LOBBY_PORTAL.x;
  b.y = LOBBY_PORTAL.y;
  assert.throws(() => sceneAction(world, b, { type: "joinScene" }, 9000));
  sceneAction(world, a, { type: "returnLobby" }, 9000);
  assert.equal(world.scene, undefined);
  sceneAction(world, b, { type: "createScene", scene: "Forest", difficulty: "Easy" }, 10000);
  assert.notEqual((world as SceneWorld).scene?.id, scene.id);
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
      assert.equal(world.scene, exit === "portal" ? undefined : scene);
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
  assert.equal(world.scene, scene);
});
