import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tickTraining,
  tickPlayerCombat,
  FOREST,
  TRAINING_ZONES,
  inTrainingZone,
  WARDROBE,
  forestDistance,
} from "@emberfall/common-new";
import { LocalMovement } from "../../client-new/src/local-movement.ts";
import { hitEnemy, fireClassAttack, damagePerSecond } from "../../common-new/src/class-combat.ts";
import { freshProgress } from "./characters.ts";
import type { Player } from "@emberfall/common-new";

const hero = (): Player => ({
  ...freshProgress(),
  id: "p",
  name: "Hero",
  color: 0,
  x: 125,
  y: 355,
});

test("boar leaves its wardrobe spawn, follows its owner and attacks training targets", () => {
  const p = {
    ...hero(),
    classId: "druid" as const,
    x: WARDROBE.x,
    y: WARDROBE.y - 15,
    attackAt: 1e6,
  };
  const s = tickTraining(undefined, [p], 10000, 0);
  p.x = 480;
  p.y = 360;
  for (let now = 10050; now <= 12000; now += 50) tickTraining(s, [p], now, 0.05);
  assert(forestDistance(p.bear!, p) <= 20.01, "boar must escape the wardrobe and follow");
  p.x = 175;
  p.y = 355;
  let bearHit = false;
  for (let now = 12050; now <= 16000; now += 50) {
    tickTraining(s, [p], now, 0.05);
    bearHit ||= s.damage.some((hit) => hit.amount === 2);
  }
  assert(bearHit, "boar must chase and hit the dummy");
  assert.equal(p.experience, 0);
});

test("training has one and six stationary, harmless targets and regenerates every second", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const p = hero();
  let s = tickTraining(undefined, [], 10000, 0);
  const positions = s.enemies.map(({ x, y }) => ({ x, y }));
  assert.equal(s.enemies.length, 7);
  assert.equal(s.enemies.filter((e) => e.x === TRAINING_ZONES[0].x).length, 1);
  assert.deepEqual(
    s.enemies.slice(1).map((e) => e.y),
    [315, 355, 355, 395, 395, 395],
  );
  assert(s.enemies.every((e) => e.hitpoints === 1e9 && e.maxHitpoints === 1e9));
  assert(s.enemies.every((e) => e.archetype === "skeleton"));
  tickPlayerCombat(s, [p], 10000, 0);
  assert.equal(s.enemies[0].hitpoints, 1e9 - 5);
  hitEnemy(s, s.enemies[1], 1e9 + 50, p, 10000);
  assert.equal(p.experience, 0);
  assert.equal(s.drops, undefined);
  s = tickTraining(s, [], 10999, 0.05);
  assert.equal(s.enemies[0].hitpoints, 1e9 - 5);
  s = tickTraining(s, [], 11000, 0.05);
  assert(s.enemies.every((e) => e.hitpoints === 1e9 && !e.attack));
  assert.deepEqual(
    s.enemies.map(({ x, y }) => ({ x, y })),
    positions,
  );
  assert.equal(p.hitpoints, p.maxHitpoints);
  assert.equal(s.projectiles, undefined);
});

test("training area boundaries gate server attacks, Bear hunting, and client swing prediction", async () => {
  for (const zone of TRAINING_ZONES) {
    assert(inTrainingZone({ x: zone.x + 200, y: zone.y - 15 }));
    assert(inTrainingZone({ x: zone.x, y: zone.y - 15 + 180 }));
    assert(inTrainingZone({ x: zone.x + zone.radius, y: zone.y - 15 }));
    assert(!inTrainingZone({ x: zone.x + zone.radius + 0.01, y: zone.y - 15 }));
    assert(inTrainingZone({ x: zone.x, y: zone.y - 15 + zone.radius * 0.85 - 0.01 }));
    assert(!inTrainingZone({ x: zone.x, y: zone.y - 15 + zone.radius * 0.85 + 0.01 }));
  }
  for (const classId of ["warrior", "ranger", "mage", "druid"] as const) {
    const p = { ...hero(), classId, x: 480, y: 340 };
    const s = tickTraining(undefined, [p], 10000, 0.05);
    assert.equal(p.attackAt, undefined);
    assert.equal(p.bear?.attackAt, undefined);
    assert.equal(s.playerShots?.length ?? 0, 0);
    assert.equal(s.damage.length, 0);
    const movement = new LocalMovement(p.id, () => {});
    const world = {
      id: "test",
      name: "test",
      hostId: p.id,
      players: [p],
      training: s,
      serverNow: 10000,
    };
    movement.render(world, 0);
    assert.equal(movement.animateAttack(p, world, 0), false);
    p.x = 300;
    tickTraining(s, [p], 10050, 0.05);
    assert.equal(p.attackAt, 10050);
    const confirmed = { ...world, serverNow: 10050, players: [{ ...p }] };
    const displayed = movement.render(confirmed, 50)!;
    assert(movement.animateAttack(displayed, confirmed, 50));
    assert.equal(displayed.attackAt, 50);
    p.x = 480;
    tickTraining(s, [p], 10100, 0.05);
    assert.equal(p.attackAt, undefined);
    assert.equal(p.bear?.attackAt, undefined);
    assert.equal(movement.animateAttack(p, world, 100), false);
    assert.equal(p.attackAt, undefined);
  }
});

test("all lobby classes damage dummies, Bear contributes, and forest players cannot attack them", async () => {
  for (const classId of ["warrior", "ranger", "mage", "druid"] as const) {
    const p = { ...hero(), classId, x: 175 };
    const s = tickTraining(undefined, [p], 10000, 0.05);
    for (let now = 10050; now < 11000; now += 50) tickTraining(s, [p], now, 0.05);
    assert(s.enemies[0].hitpoints < 1e9, classId);
    assert(p.dps! > 0, classId);
    if (classId === "druid") assert(p.bear?.attackAt !== undefined);
  }
  const p = { ...hero(), scene: "forest" as const };
  const s = tickTraining(undefined, [p], 10000, 0.05);
  assert(s.enemies.every((e) => e.hitpoints === 1e9));
});

test("boar reaches a stationary dummy from every side and keeps landing tusk attacks", async () => {
  for (const [dx, dy] of [
    [110, 0],
    [-110, 0],
    [0, 90],
    [0, -110],
    [78, 78],
    [-78, -78],
  ]) {
    const p = {
      ...hero(),
      classId: "druid" as const,
      x: TRAINING_ZONES[0].x + dx,
      y: TRAINING_ZONES[0].y + dy,
      attackAt: 1e6,
    };
    assert(inTrainingZone(p));
    const s = tickTraining(undefined, [p], 10000, 0.05);
    for (let now = 10050; now <= 12500; now += 50) tickTraining(s, [p], now, 0.05);
    const bear = p.bear!,
      dummy = s.enemies[0];
    assert(Math.abs(Math.hypot(bear.x - dummy.x, bear.y - dummy.y) - 80) < 1e-6);
    assert.equal(bear.moving, false);
    assert(p.dps! >= 1.2, "at least three boar hits, with player roots disabled");
    assert(s.damage.some((hit) => hit.amount === 2));
    assert.equal(dummy.x, TRAINING_ZONES[0].x);
    assert.equal(dummy.y, TRAINING_ZONES[0].y);
  }
});

test("DPS counts actual damage once, attributes ailments and Bear, and expires after five seconds", async () => {
  const p = hero(),
    other = { ...hero(), id: "other" };
  const s = tickTraining(undefined, [], 10000, 0);
  s.enemies[0].hitpoints = 3;
  hitEnemy(s, s.enemies[0], 5, p, 10000);
  hitEnemy(s, s.enemies[0], 5, p, 10000);
  assert.equal(damagePerSecond(p, 10000), 0.6);
  assert.equal(damagePerSecond(other, 10000), 0);
  assert.equal(damagePerSecond(p, 14999), 0.6);
  assert.equal(damagePerSecond(p, 15000), 0);
});

test("roots include exactly 250 units, exclude farther targets, and work across forest edges", async () => {
  const p = { ...hero(), classId: "druid" as const };
  const s = tickTraining(undefined, [], 10000, 0);
  s.enemies = [250, 250.01, 249].map((distance, id) => ({
    id,
    x: p.x + distance,
    y: p.y,
    angle: 0,
    hitpoints: 100,
  }));
  fireClassAttack(s, p, 10000);
  assert.deepEqual(
    s.playerShots!.map((shot) => shot.targetId),
    [2, 2],
  );
  assert(s.enemies.every((e) => e.debuffs === undefined));
  p.x = 5;
  s.enemies = [{ id: 4, x: FOREST.width - 245, y: p.y, angle: 0, hitpoints: 100 }];
  fireClassAttack(s, p, 10000);
  assert.deepEqual(
    s.playerShots!.slice(-2).map((shot) => shot.targetId),
    [4, 4],
  );
});
