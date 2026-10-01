import { edgeArrow } from "../../client/src/navigation.ts";
import { swordOverlapsEnemy, smoothAttackAngle } from "@emberfall/common";
import { test } from "node:test";
import assert from "node:assert/strict";
import { SnapshotBuffer } from "../../client/src/snapshots.ts";
import { FOREST, stepCombat } from "@emberfall/common";
import type { WorldState, Player, SceneState } from "@emberfall/common";
const hero: Player = {
  id: "p",
  name: "P",
  x: 420,
  y: 340,
  color: 0,
  hitpoints: 100,
  maxHitpoints: 100,
  manapoints: 50,
  maxManapoints: 50,
  level: 1,
  experience: 0,
  playtimeSeconds: 0,
};
const snapshot = (time: number, x: number): WorldState => ({
  id: "room",
  name: "Room",
  hostId: "p",
  serverNow: time,
  players: [{ ...hero, x, inputX: 1 }],
});
test("confirmed movement interpolates, never extrapolates, and holds through packet gaps", () => {
  const buffer = new SnapshotBuffer("p");
  const base = snapshot(10000, 420);
  buffer.push(base, 0);
  assert.equal(buffer.render(0)!.players[0].x, 420);
  for (let i = 1; i <= 4; i++) {
    buffer.push(snapshot(10000 + i * 50, 420 + i * 9), i * 50);
    buffer.render(i * 50);
  }
  const middle = buffer.render(225)!;
  assert(middle.players[0].x > 438 && middle.players[0].x < 447);
  assert.equal(buffer.render(2000)!.players[0].x, 456);
  assert.equal(buffer.render(3000)!.players[0].x, 456);
  assert.equal(buffer.render(3000)!.players[0].inputX, 0);
  assert.equal(base.players[0].x, 420);
  buffer.push(snapshot(10050, 100), 3100);
  assert.equal(buffer.render(3100)!.players[0].x, 456, "stale packets must not rewind playback");
});
test("snapshot playback wraps edges, snaps area transfers, and does not predict damage", () => {
  const buffer = new SnapshotBuffer("p");
  const forest = snapshot(10000, FOREST.width - 4);
  forest.players[0].scene = "forest";
  forest.players[0].y = 1280;
  forest.scene = { id: "run", enemies: [], phase: "active" } as unknown as SceneState;
  buffer.push(forest, 0);
  buffer.render(0);
  const next = structuredClone(forest);
  next.serverNow = 10050;
  next.players[0].x = 5;
  buffer.push(next, 50);
  buffer.render(50);
  const halfway = buffer.render(125)!;
  assert(halfway.players[0].x < 10 || halfway.players[0].x > FOREST.width - 10);
  assert.equal(halfway.players[0].hitpoints, 100);
  buffer.push(snapshot(10100, 480), 150);
  assert.equal(buffer.render(150)!.players[0].x, 480);
});
test("boss defeat puts fixed return portals within reach of all scattered players", () => {
  const players = [
    { ...hero, scene: "forest" as const, x: 12, y: 1200 },
    { ...hero, id: "q", scene: "forest" as const, x: 4300, y: 200 },
  ];
  const scene: SceneState = {
    id: "run",
    type: "Forest" as const,
    difficulty: "Easy" as const,
    phase: "active" as const,
    ready: [],
    countdownAt: null,
    bossId: 99,
    endsAt: 10000,
    nextSpawn: 20000,
    sequence: 0,
    damage: [],
    enemies: [{ id: 99, kind: "boss", x: 50, y: 1200, hitpoints: 5, angle: 0 }],
    portals: [],
  };
  stepCombat(scene, players, 10000, 0.05);
  assert.deepEqual(scene.portals, [
    { x: 12, y: 1215 },
    { x: 4300, y: 215 },
  ]);
  players[0].x = 500;
  assert.equal(scene.portals[0].x, 12, "portal must stay in the scene, not follow a player");
});

test("sword reaches 88 units in its forward semicircle, with unchanged damage", () => {
  const player = { ...hero, scene: "forest" as const, x: 2400, y: 1280 };
  const scene: SceneState = {
    id: "range",
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: 120000,
    nextSpawn: 1e9,
    sequence: 0,
    damage: [],
    portals: [],
    enemies: [
      { id: 1, x: 2480, y: 1280, hitpoints: 10, angle: 0 },
      { id: 2, x: 2488, y: 1280, hitpoints: 10, angle: 0 },
      { id: 3, x: 2499, y: 1280, hitpoints: 10, angle: 0 },
      { id: 4, x: 2312, y: 1280, hitpoints: 10, angle: 0 },
    ],
  };
  stepCombat(scene, [player], 10000, 0);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [5, 5, 10, 10],
  );
});

test("sword body overlap includes arc and diameter edges, and wraps across the forest seam", () => {
  const p = { ...hero, scene: "forest" as const, x: 2400, y: 1280, attackAngle: 0 };
  const enemy = { id: 1, x: p.x + 98, y: p.y, hitpoints: 10, angle: 0 };
  assert(swordOverlapsEnemy(p, enemy));
  enemy.x += 1;
  assert(!swordOverlapsEnemy(p, enemy));
  enemy.x = p.x - 9;
  enemy.y = p.y + 40;
  assert(swordOverlapsEnemy(p, enemy));
  enemy.x = p.x - 11;
  assert(!swordOverlapsEnemy(p, enemy));
  p.x = FOREST.width - 5;
  enemy.x = 20;
  enemy.y = p.y;
  assert(swordOverlapsEnemy(p, enemy));
});

test("every enemy overlapping during a swing is hit once, including late entrants and retargets", () => {
  const player = { ...hero, scene: "forest" as const, x: 2400, y: 1280 };
  const scene: SceneState = {
    id: "sweep",
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: 120000,
    nextSpawn: 1e9,
    sequence: 100,
    damage: [],
    portals: [],
    enemies: [
      { id: 1, x: 2440, y: 1280, hitpoints: 50, angle: 0 },
      { id: 2, x: 2498, y: 1280, hitpoints: 50, angle: 0 },
      { id: 3, x: 2540, y: 1280, hitpoints: 50, angle: 0 },
    ],
  };
  stepCombat(scene, [player], 10000, 0);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [45, 45, 50],
  );
  scene.enemies[2].x = 2380;
  stepCombat(scene, [player], 10100, 0.1);
  assert(player.attackAngle! > Math.PI / 2 && player.attackAngle! < Math.PI);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [45, 45, 45],
  );
  scene.enemies[2].x = 2540;
  stepCombat(scene, [player], 10200, 0.1);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [45, 45, 45],
  );
  scene.enemies.push({ id: 4, x: 2460, y: 1280, hitpoints: 50, angle: 0 });
  stepCombat(scene, [player], 10300, 0);
  assert.equal(scene.enemies[3].hitpoints, 50, "no hits after the active window");
  stepCombat(scene, [player], 10700, 0);
  assert.deepEqual(
    scene.enemies.map((e) => e.hitpoints),
    [40, 40, 45, 45],
  );
});

test("attack rotation takes the short path and is consistent at server and display frame rates", () => {
  const degrees = Math.PI / 180;
  const angle = smoothAttackAngle(179 * degrees, -179 * degrees, 0.016);
  assert(angle > 179 * degrees && angle < Math.PI);
  const rotate = (steps: number) => {
    let value = 0;
    for (let i = 0; i < steps; i++) value = smoothAttackAngle(value, Math.PI / 2, 0.3 / steps);
    return value;
  };
  assert(Math.abs(rotate(6) - rotate(18)) < 1e-10);
  assert.equal(smoothAttackAngle(undefined, 1.2, 0), 1.2);
  assert.equal(smoothAttackAngle(0.5, 1.2, 0), 0.5);
});

test("kills drop experience and 10-percent coins; shared pickups grant nothing and expire", (t) => {
  let roll = 0.099;
  t.mock.method(Math, "random", () => roll);
  const player = { ...hero, scene: "forest" as const, x: 2400, y: 1280 };
  const scene: SceneState = {
    id: "loot",
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: 120000,
    nextSpawn: 1e9,
    sequence: 100,
    damage: [],
    portals: [],
    enemies: [{ id: 1, x: 2440, y: 1280, hitpoints: 5, angle: 0 }],
  };
  stepCombat(scene, [player], 10000, 0);
  assert.deepEqual(
    scene.drops!.map((d) => d.kind),
    ["experience", "gold"],
  );
  const experience = player.experience;
  player.x = 2440;
  stepCombat(scene, [player], 10200, 0);
  assert.equal(scene.drops!.length, 2, "initial hop is visible before pickup");
  stepCombat(scene, [player], 10300, 0);
  assert.equal(scene.drops!.length, 0);
  assert.equal(player.experience, experience, "collection grants no extra experience");
  roll = 0.1;
  scene.enemies = [{ id: 2, x: 2480, y: 1280, hitpoints: 5, angle: 0 }];
  stepCombat(scene, [player], 10700, 0);
  assert.deepEqual(
    scene.drops!.map((d) => d.kind),
    ["experience"],
  );
  scene.phase = "ended";
  stepCombat(scene, [player], 71000, 0);
  assert.equal(scene.drops!.length, 0);
});

test("edge indicators stay inset, point toward offscreen targets, and hide onscreen", () => {
  assert.equal(edgeArrow(300, 200, 800, 600), null);
  assert.deepEqual(edgeArrow(1200, 300, 800, 600), { x: 772, y: 300, angle: 0 });
  const corner = edgeArrow(-900, -1200, 800, 600)!;
  assert(corner.x >= 28 && corner.y >= 28);
  assert(corner.angle < -Math.PI / 2);
});

test("loot flies toward the nearest living forest player across the seam without rewards", () => {
  const scene: SceneState = {
    id: "magnet",
    type: "Forest",
    difficulty: "Easy",
    phase: "ended",
    ready: [],
    countdownAt: null,
    endsAt: 0,
    sequence: 0,
    nextSpawn: 0,
    enemies: [],
    damage: [],
    portals: [],
    drops: [
      { id: 1, kind: "experience", x: FOREST.width - 80, y: 500, at: 0 },
      { id: 2, kind: "gold", x: FOREST.width - 80, y: 500, at: 0 },
    ],
  };
  const player = { ...hero, scene: "forest" as const, x: 10, y: 500 };
  const dead = { ...player, id: "dead", x: FOREST.width - 70, hitpoints: 0 };
  const lobby = { ...hero, id: "lobby", x: FOREST.width - 70, y: 500 };
  stepCombat(scene, [dead, lobby, player], 400, 0.05);
  assert.equal(scene.drops![0].x, FOREST.width - 66);
  assert.equal(scene.drops![1].x, FOREST.width - 66);
  for (let i = 0; i < 10; i++) stepCombat(scene, [player], 450 + i * 50, 0.05);
  assert.equal(scene.drops!.length, 0);
  assert.equal(player.experience, hero.experience);
  scene.drops = [{ id: 3, kind: "gold", x: 500, y: 500, at: 0 }];
  stepCombat(scene, [player], 1000, 0.05);
  assert.equal(scene.drops[0].x, 500, "distant drops stay put");
});

test("fatal hits retain each enemy appearance for its death animation", () => {
  for (const archetype of ["skeleton", "runner", "brute", "caster"] as const) {
    const scene: SceneState = {
      id: archetype,
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: 120000,
      sequence: 0,
      nextSpawn: 1e9,
      damage: [],
      portals: [],
      enemies: [{ id: 1, archetype, kind: "elite", x: 2440, y: 1280, hitpoints: 5, angle: 1 }],
    };
    stepCombat(scene, [{ ...hero, scene: "forest", x: 2400, y: 1280 }], 10000, 0);
    assert.equal(scene.enemies.length, 0);
    assert.deepEqual(scene.damage[0].enemy, { archetype, kind: "elite", angle: 1 });
  }
});

test("moving loot interpolates across the seam without mutating server snapshots", () => {
  const first = snapshot(10000, 10);
  first.players[0].scene = "forest";
  first.scene = {
    id: "drops",
    type: "Forest",
    difficulty: "Easy",
    phase: "ended",
    ready: [],
    countdownAt: null,
    endsAt: 0,
    enemies: [],
    damage: [],
    portals: [],
    sequence: 0,
    nextSpawn: 0,
    drops: [{ id: 1, kind: "gold", x: FOREST.width - 10, y: 500, at: 0 }],
  };
  const second = structuredClone(first);
  second.serverNow = 10100;
  second.scene!.drops![0].x = 10;
  const buffer = new SnapshotBuffer("p");
  buffer.push(first, 0);
  buffer.push(second, 100);
  const x = buffer.render(150)!.scene!.drops![0].x;
  assert(x < 10 || x > FOREST.width - 10, "interpolation takes the short path");
  assert.equal(first.scene.drops![0].x, FOREST.width - 10);
});
