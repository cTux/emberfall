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
  nearbyInteraction,
  WARDROBE,
  clientMessage,
} from "@emberfall/common";
import {
  hitEnemy,
  tickDebuffs,
  fireClassAttack,
  tickPlayerShots,
} from "../../common/src/class-combat.ts";
import type { Player, SceneState, Enemy } from "@emberfall/common";
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
    store.selectClass(old.id, player, "warrior");
    assert.equal(player.level, 4);
    assert.equal(player.experience, 234);
  } finally {
    store.close();
    rmSync(directory, { recursive: true });
  }
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
