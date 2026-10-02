import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalMovement } from "../../client/src/local-movement.ts";
import { SnapshotBuffer } from "../../client/src/snapshots.ts";
import { fireClassAttack, FOREST } from "@emberfall/common";
import type { Player, WorldState, SceneState } from "@emberfall/common";

function fixture(classId: Player["classId"] = "mage", training = false): WorldState {
  const scene: SceneState = {
    id: training ? "training" : "forest",
    training,
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: null,
    portals: [],
    sequence: 0,
    nextSpawn: 20000,
    damage: [],
    enemies: [1, 2].map((id) => ({
      id,
      x: (training ? 140 : 2400) + 140 + id * 20,
      y: training ? 340 : 1280,
      hitpoints: 100,
      angle: 0,
    })),
  };
  return {
    id: "room",
    name: "R",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "P",
        x: training ? 140 : 2400,
        y: training ? 340 : 1280,
        classId,
        scene: training ? undefined : "forest",
        attackAt: 9400,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
      },
    ],
    ...(training ? { training: scene } : { scene }),
  };
}

function frame(movement: LocalMovement, source: WorldState, now: number) {
  const player = movement.render(source, now)!;
  const view = structuredClone(source);
  const started = movement.animateAttack(player, view, now);
  movement.animateProjectiles(player, view, now, started);
  return { player, scene: (player.scene ? view.scene : view.training)! };
}

test("moving casts launch at the displayed player before a reply, with no predicted damage", () => {
  for (const training of [false, true]) {
    const source = fixture("mage", training),
      before = structuredClone(source);
    const movement = new LocalMovement("p", () => {});
    frame(movement, source, 0);
    movement.input(1, 0, 0);
    const cast = frame(movement, source, 100);
    assert(cast.player.x > source.players[0].x);
    assert.equal(cast.scene.playerShots!.length, 2);
    assert(cast.scene.playerShots!.every((s) => s.x === cast.player.x && s.y === cast.player.y));
    assert(cast.scene.playerShots!.every((s) => s.castAt === 10100));
    const flight = frame(movement, source, 150);
    assert(flight.scene.playerShots!.every((s) => s.x > cast.player.x));
    assert(flight.scene.enemies.every((e) => e.hitpoints === 100));
    assert.equal(flight.scene.damage.length, 0);
    assert.deepEqual(source, before);
  }
});

test("confirmation preserves launch trajectory, suppresses duplicates and retires completed casts", () => {
  const source = fixture(),
    movement = new LocalMovement("p", () => {});
  frame(movement, source, 0);
  movement.input(1, 0, 0);
  const cast = frame(movement, source, 100);
  const confirmed = structuredClone(source);
  confirmed.serverNow = 10100;
  confirmed.players[0].attackAt = 10100;
  fireClassAttack(confirmed.scene!, confirmed.players[0]);
  confirmed.scene!.playerShots!.push({
    ...confirmed.scene!.playerShots![0],
    ownerId: "remote",
    id: 90,
  });
  const result = frame(movement, confirmed, 150);
  const local = result.scene.playerShots!.filter((s) => s.ownerId === "p");
  assert.equal(local.length, 2);
  assert(
    local.every((s) => s.x > cast.player.x),
    "confirmation cannot snap shots back to the server origin",
  );
  assert.equal(result.scene.playerShots!.filter((s) => s.ownerId === "remote").length, 1);
  confirmed.scene!.playerShots = [];
  const completed = structuredClone(confirmed);
  completed.serverNow = 10150;
  assert.equal(frame(movement, completed, 200).scene.playerShots!.length, 0);
});

test("server target corrections and rejected casts do not replay an old launch", () => {
  const source = fixture(),
    movement = new LocalMovement("p", () => {});
  frame(movement, source, 0);
  frame(movement, source, 100);
  const reply = structuredClone(source);
  reply.serverNow = 10100;
  reply.players[0].attackAt = 10100;
  reply.scene!.enemies = [{ ...reply.scene!.enemies[0], id: 3 }];
  fireClassAttack(reply.scene!, reply.players[0]);
  const corrected = frame(movement, reply, 150).scene.playerShots!;
  assert.equal(corrected.length, 1);
  assert.equal(corrected[0].targetId, 3);
  const rejected = structuredClone(reply);
  rejected.scene!.playerShots = [];
  rejected.serverNow = 10150;
  assert.equal(frame(movement, rejected, 200).scene.playerShots!.length, 0);
});

test("prediction wraps, expires and clears on death, class/area changes and stale replies", () => {
  const source = fixture("ranger");
  source.players[0].x = FOREST.width - 5;
  source.scene!.enemies = [{ ...source.scene!.enemies[0], x: 80 }];
  const movement = new LocalMovement("p", () => {});
  frame(movement, source, 0);
  assert.equal(frame(movement, source, 100).scene.playerShots!.length, 1);
  assert(frame(movement, source, 150).scene.playerShots![0].x < 80);
  assert.equal(frame(movement, source, 1100).scene.playerShots!.length, 0);
  for (const change of ["death", "class", "area", "paused"] as const) {
    const current = fixture(),
      m = new LocalMovement("p", () => {});
    frame(m, current, 0);
    assert.equal(frame(m, current, 100).scene.playerShots!.length, 2);
    const next = structuredClone(current);
    next.serverNow = 10050;
    if (change === "death") next.players[0].hitpoints = 0;
    if (change === "class") next.players[0].classId = "warrior";
    if (change === "area") next.scene!.id = "another";
    if (change === "paused") next.scene!.pausedAt = 10050;
    assert.equal(frame(m, next, 150).scene.playerShots!.length, 0);
  }
});

test("training snapshots are detached before local projectile rendering", () => {
  const source = fixture("mage", true),
    before = structuredClone(source);
  const snapshots = new SnapshotBuffer("p"),
    movement = new LocalMovement("p", () => {});
  snapshots.push(source, 0);
  movement.render(source, 0);
  const player = movement.render(source, 100)!;
  const view = snapshots.render(100)!;
  movement.animateProjectiles(player, view, 100, movement.animateAttack(player, view, 100));
  assert.equal(view.training!.playerShots!.length, 2);
  assert.deepEqual(source, before);
});

test("a server cast with a previously unseen target still launches at the displayed player once", () => {
  const source = fixture(),
    movement = new LocalMovement("p", () => {});
  source.scene!.enemies = [];
  frame(movement, source, 0);
  movement.input(1, 0, 0);
  assert.equal(frame(movement, source, 100).scene.playerShots!.length, 0);
  const reply = fixture();
  reply.serverNow = 10100;
  reply.players[0].attackAt = 10100;
  fireClassAttack(reply.scene!, reply.players[0]);
  const result = frame(movement, reply, 150);
  assert.equal(result.scene.playerShots!.length, 2);
  assert(result.scene.playerShots!.every((s) => s.x === result.player.x));
  assert.equal(frame(movement, reply, 200).scene.playerShots!.length, 2);
  for (let now = 250; now <= 650; now += 50) frame(movement, reply, now);
  assert.equal(frame(movement, reply, 650).scene.playerShots!.length, 0);
});
