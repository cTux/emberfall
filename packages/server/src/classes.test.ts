import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CharacterStore, freshProgress } from "./characters.ts";
import {
  spawnArchetype,
  enemyMaxHealth,
  stepCombat,
  FOREST,
  ARENA,
  nearbyInteraction,
  WARDROBE,
  clientMessage,
  tickCompanion,
  forestDistance,
} from "@emberfall/common";
import {
  hitEnemy,
  tickDebuffs,
  fireClassAttack,
  tickPlayerShots,
} from "../../common/src/class-combat.ts";
import type { Player, SceneState, Enemy } from "@emberfall/common";
import { moveEnemies } from "../../common/src/enemies.ts";
const hero = (): Player => ({
  ...freshProgress(),
  id: "p",
  name: "Hero",
  x: 2400,
  y: 1280,
  color: 0,
  scene: "forest",
});
const enemy = (id: number, x = 2480, hp = 100): Enemy => ({
  id,
  x,
  y: 1280,
  hitpoints: hp,
  angle: 0,
});
const scene = (): SceneState => ({
  id: "s",
  type: "Forest",
  difficulty: "Easy",
  phase: "active",
  ready: [],
  countdownAt: null,
  endsAt: 1e9,
  nextSpawn: 1e9,
  sequence: 100,
  enemies: [],
  damage: [],
  portals: [],
});

test("class records migrate legacy progress, save independently, and survive restart", () => {
  const directory = mkdtempSync(join(tmpdir(), "emberfall-classes-"));
  const file = join(directory, "save.sqlite");
  let store = new CharacterStore(file);
  try {
    const created = store.create("Hero");
    store.save(created.id, "Hero", {
      ...created.progress,
      level: 4,
      experience: 234,
      talents: { strength: 2 },
    });
    const old = store.load(created.token);
    assert.equal(old.classId, "warrior");
    const player = { ...hero(), ...old.progress, classId: old.classId, classes: old.classes };
    store.selectClass(old.id, player, "ranger");
    assert.equal(player.level, 1);
    assert.deepEqual(player.talents, {});
    player.experience = 17;
    store.selectClass(old.id, player, "mage");
    player.experience = 9;
    store.save(old.id, player.name, player);
    store.close();
    store = new CharacterStore(file);
    const restored = store.load(created.token);
    assert.equal(restored.classId, "mage");
    assert.equal(restored.progress.experience, 9);
    assert.equal(restored.classes.ranger.experience, 17);
    assert.equal(restored.classes.warrior.experience, 234);
    assert.deepEqual(restored.classes.warrior.talents, { strength: 2 });
    assert.equal(restored.classes.druid.maxHitpoints, 100);
    store.selectClass(old.id, player, "druid");
    player.experience = 42;
    store.save(old.id, player.name, player);
    assert.equal(store.load(created.token).classes.druid.experience, 42);
    store.selectClass(old.id, player, "warrior");
    assert.equal(player.level, 4);
    assert.equal(player.experience, 234);
  } finally {
    store.close();
    rmSync(directory, { recursive: true });
  }
});

test("druid roots target two enemies, prefer unrooted targets, refresh without delaying ticks, and expire", () => {
  const s = scene(),
    p = { ...hero(), classId: "druid" as const };
  s.enemies = [enemy(1, 2420), enemy(2, 2480), enemy(3, 2540)];
  fireClassAttack(s, p, 10000);
  assert.deepEqual(
    s.enemies.map((e) => e.debuffs?.[0]?.kind),
    ["roots", "roots", undefined],
  );
  fireClassAttack(s, p, 10700);
  assert.equal(s.enemies[0].debuffs![0].expiresAt, 15700);
  assert.equal(s.enemies[1].debuffs![0].expiresAt, 15000);
  assert.equal(s.enemies[2].debuffs![0].kind, "roots");
  fireClassAttack(s, p, 11400);
  assert.equal(s.enemies[2].debuffs![0].kind, "roots");
  fireClassAttack(s, p, 12100);
  assert.equal(s.enemies[0].debuffs![0].nextTick, 11000);
  tickDebuffs(s, [p], 13000);
  assert.deepEqual(
    s.enemies.map((e) => e.hitpoints),
    [94, 94, 96],
  );
  tickDebuffs(s, [p], 17100);
  assert.deepEqual(
    s.enemies.map((e) => e.hitpoints),
    [86, 86, 90],
  );
  assert(s.enemies.every((e) => e.debuffs?.length === 0));
  assert.equal(s.playerShots, undefined);
});

test("roots immobilize ordinary enemies but leave bosses mobile, and root kills complete the boss", () => {
  const s = scene(),
    p = { ...hero(), classId: "druid" as const, attackAt: 10000 };
  const normal = enemy(1),
    boss = { ...enemy(2, 2300, 2), kind: "boss" as const };
  s.enemies = [normal, boss];
  s.bossId = boss.id;
  fireClassAttack(s, p, 10000);
  fireClassAttack(s, p, 10000);
  moveEnemies([normal], [p], 0.1, 10100);
  assert.equal(normal.x, 2480);
  moveEnemies([boss], [p], 0.1, 10100);
  assert(boss.x > 2300);
  p.x = 2000;
  stepCombat(s, [p], 11000, 0);
  assert.equal(s.phase, "ended");
  assert.equal(p.experience, 1);
  assert(s.drops?.length);
});

test("bear swipes once per enemy per cycle for two damage, leashes, returns and resumes", () => {
  const s = scene(),
    p: Player = { ...hero(), classId: "druid" };
  s.enemies = [enemy(1, 2440), enemy(2, 2460)];
  tickCompanion(p, s, 10000, 0);
  const bear = p.bear!;
  assert.equal(bear.name, "Bear");
  assert.equal(bear.maxHitpoints, 150);
  assert.deepEqual(
    s.enemies.map((e) => e.hitpoints),
    [98, 98],
  );
  tickCompanion(p, s, 10050, 0);
  assert.deepEqual(
    s.enemies.map((e) => e.hitpoints),
    [98, 98],
  );
  tickCompanion(p, s, 10700, 0);
  assert.deepEqual(
    s.enemies.map((e) => e.hitpoints),
    [96, 96],
  );
  bear.x = p.x + 220;
  tickCompanion(p, s, 11400, 0.05);
  assert(bear.returning);
  assert.equal(bear.attackAt, undefined);
  assert(bear.x < p.x + 220);
  bear.x = p.x + 60;
  tickCompanion(p, s, 11450, 0);
  assert(bear.returning);
  bear.x = p.x + 19;
  tickCompanion(p, s, 11500, 0);
  assert(!bear.returning);
  tickCompanion(p, s, 12400, 0);
  assert.deepEqual(
    s.enemies.map((e) => e.hitpoints),
    [94, 94],
  );
});

test("bear only targets and chases inside the owner's 200-unit radius, including wrapped edges", () => {
  const s = scene(),
    p: Player = { ...hero(), classId: "druid" };
  const e = enemy(1, p.x + 201);
  s.enemies = [e];
  tickCompanion(p, s, 10000, 0.05);
  const bear = p.bear!;
  assert.equal(bear.x, p.x);
  assert.equal(bear.attackAt, undefined);
  e.x = p.x + 200;
  tickCompanion(p, s, 11000, 0.05);
  assert(bear.x > p.x);
  assert.equal(bear.attackAt, 11000);
  bear.x = p.x + 40;
  const chasedX = bear.x;
  e.x = p.x + 201;
  tickCompanion(p, s, 11050, 0.05);
  assert(bear.x < chasedX);
  assert.equal(bear.attackAt, undefined);
  bear.x = p.x + 200;
  tickCompanion(p, s, 11100, 0);
  assert(!bear.returning);
  bear.x = p.x + 201;
  tickCompanion(p, s, 11150, 0);
  assert(bear.returning);
  p.x = 5;
  bear.x = 5;
  bear.returning = false;
  e.x = FOREST.width - 196;
  tickCompanion(p, s, 12000, 0);
  assert.equal(bear.attackAt, undefined);
  e.x = FOREST.width - 195;
  tickCompanion(p, s, 13000, 0);
  assert.equal(bear.attackAt, 13000);
});

test("Bear stops in claw range, backs away from close enemies, and preserves spacing across seams", () => {
  const s = scene(),
    p: Player = { ...hero(), classId: "druid", x: 2300 };
  const e = enemy(1, 2480);
  s.enemies = [e];
  tickCompanion(p, s, 10000, 1);
  const bear = p.bear!;
  assert.equal(forestDistance(bear, e), 80);
  assert.equal(e.hitpoints, 98);
  const stoppedX = bear.x;
  tickCompanion(p, s, 10050, 0.05);
  assert.equal(bear.x, stoppedX);
  assert.equal(bear.moving, false);
  e.x = bear.x + 20;
  tickCompanion(p, s, 10999, 0.05);
  assert.equal(bear.x, stoppedX, "hold the destination until one second has elapsed");
  tickCompanion(p, s, 11000, 0.3);
  assert.equal(forestDistance(bear, e), 80);
  assert(bear.x < stoppedX);
  assert.equal(bear.moving, true);
  p.x = 5;
  bear.x = FOREST.width - 20;
  e.x = 25;
  tickCompanion(p, s, 12000, 0.25);
  assert.equal(forestDistance(bear, e), 80);
  assert.equal(e.hitpoints, 94);
});

test("Bear moves at 1.3 times player speed in forest and village", () => {
  for (const forest of [true, false]) {
    const p: Player = {
      ...hero(),
      classId: "druid",
      scene: forest ? "forest" : undefined,
      x: forest ? 2400 : 480,
      y: forest ? 1280 : 360,
    };
    tickCompanion(p, undefined, 10000, 0);
    p.bear!.x -= 100;
    const start = { x: p.bear!.x, y: p.bear!.y };
    tickCompanion(p, undefined, 10050, 0.05);
    assert(
      Math.abs(Math.hypot(p.bear!.x - start.x, p.bear!.y - start.y) - ARENA.speed * 1.3 * 0.05) <
        1e-6,
    );
  }
});

test("Bear dodges telegraphed attacks and sidesteps incoming projectiles", () => {
  const s = scene(),
    p: Player = { ...hero(), classId: "druid" };
  tickCompanion(p, s, 10000, 0);
  const bear = p.bear!,
    e = enemy(1, 2460);
  s.enemies = [e];
  e.attack = { startedAt: 11000, endsAt: 11500, x: bear.x, y: bear.y, radius: 40, ranged: false };
  tickCompanion(p, s, 11000, 0.25);
  assert(forestDistance(bear, e.attack) > e.attack.radius);
  e.attack = undefined;
  const safeX = bear.x;
  tickCompanion(p, s, 11999, 0.05);
  assert(
    Math.abs(bear.x - safeX) < 1e-6,
    "do not strafe back to the attack point between decisions",
  );
  assert.equal(bear.moving, false);
  bear.x = p.x;
  bear.y = p.y;
  s.projectiles = [{ id: 2, x: bear.x - 40, y: bear.y, vx: 210, vy: 0, expiresAt: 14000 }];
  tickCompanion(p, s, 12000, 0.05);
  assert(bear.y > p.y);
  p.x = 2320;
  p.attackAt = 1e6;
  for (let i = 1; i <= 8; i++) stepCombat(s, [p], 12000 + i * 50, 0.05);
  assert.equal(bear.hitpoints, 150);
  assert(s.projectiles.some((shot) => shot.x > 2400));
});

test("Bear repositions on its reaction interval while continuing to damage melee enemies", () => {
  for (const archetype of ["skeleton", "runner", "brute"] as const) {
    const s = scene(),
      p: Player = { ...hero(), classId: "druid", x: 2300, attackAt: 1e6 };
    const e = { ...enemy(1, 2480, 1000), archetype };
    s.enemies = [e];
    tickCompanion(p, s, 10000, 1);
    for (let i = 1; i <= 40; i++) stepCombat(s, [p], 10000 + i * 50, 0.05);
    assert(p.bear!.hitpoints > 0, archetype);
    assert(e.hitpoints < 998, archetype);
    tickCompanion(p, s, 13000, 0.5);
    assert(Math.abs(forestDistance(p.bear!, e) - 80) < 1e-6, archetype);
  }
});

test("Bear teleports only beyond 500 pixels, using wrapped forest distance, without bypassing death", () => {
  for (const forest of [true, false]) {
    const p: Player = {
      ...hero(),
      classId: "druid",
      scene: forest ? "forest" : undefined,
      x: forest ? 2400 : 100,
      y: forest ? 1280 : 360,
    };
    tickCompanion(p, undefined, 10000, 0);
    const bear = p.bear!;
    bear.x = p.x + 500;
    tickCompanion(p, undefined, 10050, 0);
    assert.equal(bear.x, p.x + 500);
    bear.x++;
    bear.attackAt = 10000;
    tickCompanion(p, undefined, 10100, 0.05);
    assert.equal(bear.x, p.x);
    assert.equal(bear.y, p.y);
    assert.equal(bear.moving, false);
    assert.equal(bear.returning, false);
    assert.equal(bear.attackAt, undefined);
    bear.x += 501;
    bear.hitpoints = 0;
    tickCompanion(p, undefined, 10150, 0);
    assert.equal(bear.x, p.x + 501);
    assert.equal(bear.resurrectAt, 15150);
  }
  const p: Player = { ...hero(), classId: "druid", x: 5 };
  tickCompanion(p, undefined, 10000, 0);
  p.bear!.x = FOREST.width - 5;
  tickCompanion(p, undefined, 10050, 0);
  assert.equal(p.bear!.x, FOREST.width - 5, "nearby seam neighbors must not teleport");
  p.bear!.x = FOREST.width - 496;
  tickCompanion(p, undefined, 10100, 0);
  assert.equal(p.bear!.x, p.x);
});

test("enemies damage Bear; death resurrects exactly five seconds later at its owner", () => {
  const s = scene(),
    p: Player = { ...hero(), classId: "druid", attackAt: 10000 };
  tickCompanion(p, s, 10000, 0);
  const bear = p.bear!;
  bear.x = 2460;
  bear.hitpoints = 10;
  const e = enemy(1, 2460);
  e.attack = { startedAt: 9000, endsAt: 10000, x: 2460, y: 1280, radius: 40, ranged: false };
  s.enemies = [e];
  stepCombat(s, [p], 10000, 0);
  assert.equal(bear.hitpoints, 0);
  assert.equal(p.hitpoints, 100);
  assert.equal(bear.resurrectAt, 15000);
  p.maxHitpoints = 120;
  tickCompanion(p, s, 14999, 0);
  assert.equal(bear.hitpoints, 0);
  tickCompanion(p, s, 15000, 0);
  assert.equal(bear.hitpoints, 180);
  assert.equal(bear.x, p.x);
  assert.equal(bear.resurrectAt, undefined);
  const hitpoints = bear.hitpoints;
  s.projectiles = [{ id: 50, x: bear.x, y: bear.y, vx: 0, vy: 0, expiresAt: 20000 }];
  p.x -= 80;
  p.attackAt = 15000;
  stepCombat(s, [p], 15100, 0);
  assert.equal(bear.hitpoints, hitpoints - 10);
});

test("bear wraps its leash and follows in the village; other classes remove companions", () => {
  const p: Player = { ...hero(), classId: "druid", x: 5 };
  tickCompanion(p, scene(), 10000, 0);
  p.bear!.x = FOREST.width - 40;
  tickCompanion(p, scene(), 10050, 0);
  assert(!p.bear!.returning);
  p.scene = undefined;
  p.x = 480;
  p.y = 360;
  p.bear!.x = 550;
  p.bear!.y = 360;
  tickCompanion(p, undefined, 10100, 0.05);
  assert(p.bear!.x < 550);
  p.classId = "mage";
  tickCompanion(p, undefined, 10150, 0);
  assert.equal(p.bear, undefined);
});

test("Druid casts roots without melee damage, with zero or one target", () => {
  const s = scene(),
    p: Player = { ...hero(), classId: "druid" };
  tickCompanion(p, s, 10000, 0);
  p.bear!.hitpoints = 0;
  p.bear!.resurrectAt = 20000;
  s.enemies = [enemy(1, 2440)];
  stepCombat(s, [p], 10000, 0);
  assert.equal(s.enemies[0].hitpoints, 100);
  assert.equal(s.enemies[0].debuffs?.length, 1);
  stepCombat(s, [p], 10050, 0);
  assert.equal(s.enemies[0].debuffs![0].expiresAt, 15000);
  s.enemies = [];
  assert.doesNotThrow(() => fireClassAttack(s, p, 10700));
});

test("class selection schema and wardrobe interaction reject invalid classes and dead players", () => {
  assert(!clientMessage.safeParse({ type: "selectClass", classId: "hacker" }).success);
  const player = { ...hero(), scene: undefined, x: WARDROBE.x + 40, y: WARDROBE.y - 15 };
  assert.equal(nearbyInteraction(player)?.id, "wardrobe");
  assert.equal(nearbyInteraction({ ...player, hitpoints: 0 }), null);
});

test("one spawn roll gives exactly ten percent big and ten percent ranged with health multipliers", () => {
  const types = Array.from({ length: 100 }, (_, i) => spawnArchetype(i / 100, i));
  assert.equal(types.filter((a) => a === "brute").length, 10);
  assert.equal(types.filter((a) => a === "caster").length, 10);
  assert.equal(enemyMaxHealth({ archetype: "brute" }), 30);
  assert.equal(enemyMaxHealth({ archetype: "caster" }), 7);
  assert.equal(enemyMaxHealth({ archetype: "brute", kind: "elite" }), 150);
  assert.equal(enemyMaxHealth({ archetype: "caster", kind: "elite" }), 35);
  assert.equal(enemyMaxHealth({ archetype: "brute", kind: "boss" }), 200);
});

test("each ailment stacks, refreshes its timer, ticks once per second, and expires after five seconds", (t) => {
  t.mock.method(Math, "random", () => 0.09);
  for (const kind of ["bleed", "poison", "burn"] as const) {
    const s = scene(),
      p = hero(),
      e = enemy(1, 2480, 10000);
    s.enemies = [e];
    hitEnemy(s, e, 5, p, 0, kind);
    tickDebuffs(s, [p], 999);
    assert.equal(e.hitpoints, 9995);
    tickDebuffs(s, [p], 1000);
    assert.equal(e.hitpoints, 9994);
    hitEnemy(s, e, 5, p, 1500, kind);
    assert.equal(e.debuffs![0].stacks, 2);
    assert.equal(e.debuffs![0].expiresAt, 6500);
    tickDebuffs(s, [p], 2000);
    assert.equal(e.hitpoints, 9987);
    const before = e.hitpoints;
    tickDebuffs(s, [p], 6500);
    assert.equal(e.hitpoints, before - 8);
    assert.equal(e.debuffs!.length, 0);
    tickDebuffs(s, [p], 9000);
    assert.equal(e.hitpoints, before - 8);
    for (let i = 0; i < 100; i++) hitEnemy(s, e, 0, p, 10000, kind);
    assert.equal(e.debuffs![0].stacks, 100);
  }
});

test("proc boundary is ten percent; DOT kills use the same loot, XP and boss completion paths", (t) => {
  t.mock.method(Math, "random", () => 0.1);
  const s = scene(),
    p = hero(),
    e = enemy(1, 2480, 10);
  s.enemies = [e];
  hitEnemy(s, e, 5, p, 0, "bleed");
  assert.equal(e.debuffs, undefined);
  e.kind = "boss";
  s.bossId = e.id;
  e.debuffs = [{ kind: "burn", stacks: 5, expiresAt: 5000, nextTick: 1000, ownerId: p.id }];
  p.x = 2000;
  p.attackAt = 2000;
  stepCombat(s, [p], 1000, 0);
  assert.equal(s.phase, "ended");
  assert.equal(p.experience, 1);
  assert.equal(s.drops!.length, 1);
});

test("ranger arrows pierce every target once, wrap, and expire at 1000 units", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const s = scene(),
    p = { ...hero(), classId: "ranger" as const, x: FOREST.width - 60 };
  s.enemies = [enemy(1, FOREST.width - 20, 10), enemy(2, 30, 10), enemy(3, 960, 10)];
  fireClassAttack(s, p);
  assert.equal(s.playerShots!.length, 1);
  for (let i = 1; i <= 40; i++) tickPlayerShots(s, [p], i * 50, 0.05);
  assert.deepEqual(
    s.enemies.map((e) => e.hitpoints),
    [5, 5, 10],
  );
  assert.equal(s.playerShots!.length, 0);
});

test("mage fires at two different targets; explosions deal two damage inside 100 units", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const s = scene(),
    p = { ...hero(), classId: "mage" as const };
  s.enemies = [enemy(1, 2480), enemy(2, 2510), enemy(3, 2650)];
  fireClassAttack(s, p);
  assert.deepEqual(
    s.playerShots!.map((shot) => shot.targetId),
    [1, 2],
  );
  for (let i = 1; i <= 10; i++) tickPlayerShots(s, [p], i * 50, 0.05);
  assert.deepEqual(
    s.enemies.map((e) => e.hitpoints),
    [96, 96, 100],
  );
  assert.equal(s.playerShots!.length, 0);
  s.enemies = [enemy(4)];
  fireClassAttack(s, p);
  assert.equal(s.playerShots!.length, 1);
});

test("class attacks fire once per cycle and ranged classes never deal a melee slash", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  for (const classId of ["ranger", "mage"] as const) {
    const s = scene(),
      p = { ...hero(), classId };
    s.enemies = [enemy(1, 2440)];
    stepCombat(s, [p], 10000, 0);
    assert.equal(s.enemies[0].hitpoints, 100);
    assert.equal(s.playerShots!.length, 1);
    const id = s.playerShots![0].id;
    stepCombat(s, [p], 10050, 0);
    assert.deepEqual(
      s.playerShots!.map((shot) => shot.id),
      [id],
    );
    stepCombat(s, [p], 10700, 0);
    assert.equal(s.playerShots!.length, 2);
  }
});
