import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalMovement } from "../../client/src/local-movement.ts";
import { SnapshotBuffer } from "../../client/src/snapshots.ts";
import { fireClassAttack, FOREST, requestPlayerCast } from "@emberfall/common";
import type { Player, WorldState, SceneState, ClientMessage } from "@emberfall/common";

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

function frame(
  movement: LocalMovement,
  source: WorldState,
  now: number,
  controls?: Partial<Player>,
) {
  const player = movement.render(source, now)!;
  Object.assign(player, controls);
  const view = structuredClone(source);
  const started = movement.animateAttack(player, view, now);
  movement.animateProjectiles(player, view, now, started);
  return { player, started, scene: (player.scene ? view.scene : view.training)! };
}

test("manual confirmations with latency preserve flight and swing, correct aim and never replay completed casts", () => {
  for (const delay of [100, 150, 300]) {
    for (const classId of ["mage", "ranger", "druid"] as const) {
      const source = fixture(classId),
        before = structuredClone(source);
      source.players[0].attackAt = undefined;
      source.players[0].autoAttack = false;
      const requests: Extract<ClientMessage, { type: "cast" }>[] = [];
      const movement = new LocalMovement("p", (m) => {
        if (m.type === "cast") requests.push(m);
      });
      const controls = {
        autoAttack: false,
        autoTarget: false,
        attacking: true,
        aimX: 2600,
        aimY: 1280,
      };
      frame(movement, source, 0, { ...controls, attacking: false });
      const cast = frame(movement, source, 10, controls);
      assert.equal(requests.length, 1);
      assert.equal(cast.scene.playerShots![0].castId, requests[0].id);
      const flight = frame(movement, source, 50, controls);
      assert(flight.scene.playerShots![0].x > cast.player.x);
      const reply = structuredClone(source);
      reply.serverNow = 10010 + delay;
      reply.scene!.enemies = [{ ...reply.scene!.enemies[0], id: 3 }];
      assert(requestPlayerCast(reply.scene, reply.players[0], requests[0], reply.serverNow));
      fireClassAttack(reply.scene!, reply.players[0]);
      const confirmed = frame(movement, reply, 50 + delay, { ...controls, attacking: false });
      assert.equal(confirmed.started, false, "confirmation cannot repeat animation or sound");
      assert.equal(confirmed.player.attackAt, cast.player.attackAt);
      assert.equal(confirmed.scene.playerShots!.length, 2);
      assert(confirmed.scene.playerShots![0].x > flight.scene.playerShots![0].x);
      assert.equal(confirmed.scene.playerShots![0].targetId, undefined);
      assert.equal(requests.length, 1);
      assert.equal(confirmed.player.hitpoints, source.players[0].hitpoints);
      assert(confirmed.scene.enemies.every((e) => e.hitpoints === 100));
      const complete = structuredClone(reply);
      complete.serverNow! += 50;
      complete.scene!.playerShots = [];
      assert.equal(
        frame(movement, complete, 100 + delay, { ...controls, attacking: false }).scene.playerShots!
          .length,
        0,
      );
      assert.equal(
        frame(movement, reply, 150 + delay, { ...controls, attacking: false }).scene.playerShots!
          .length,
        0,
        "old replies cannot resurrect the visual",
      );
      assert.equal(before.players[0].hitpoints, source.players[0].hitpoints);
      assert.equal(
        frame(movement, complete, 710, controls).started,
        false,
        "held casts wait for the authoritative cooldown rather than the predicted launch",
      );
      assert.equal(frame(movement, complete, 749 + delay, controls).started, false);
      assert.equal(frame(movement, complete, 750 + delay, controls).started, true);
      assert.equal(requests.length, 2);
      assert.equal(requests[1].id, requests[0].id + 1);
    }
  }
});

test("manual rejection removes predicted effects, restores cooldown and keeps request IDs increasing", () => {
  const source = fixture();
  source.players[0].autoAttack = false;
  source.players[0].attackAt = undefined;
  const requests: Extract<ClientMessage, { type: "cast" }>[] = [];
  const movement = new LocalMovement("p", (m) => {
    if (m.type === "cast") requests.push(m);
  });
  const controls = {
    autoAttack: false,
    autoTarget: false,
    attacking: true,
    aimX: 2600,
    aimY: 1280,
  };
  frame(movement, source, 0, { ...controls, attacking: false });
  assert(frame(movement, source, 10, controls).scene.playerShots!.length > 0);
  const reply = structuredClone(source);
  reply.serverNow = 10100;
  reply.players[0].attackAt = 10050;
  assert.equal(requestPlayerCast(reply.scene, reply.players[0], requests[0], 10100), false);
  const rejected = frame(movement, reply, 150, { ...controls, attacking: false });
  assert.equal(rejected.started, false);
  assert.equal(rejected.scene.playerShots!.length, 0);
  assert.equal(rejected.player.attackAt, 100, "restore the authoritative previous swing phase");
  assert.equal(frame(movement, reply, 700, controls).started, false);
  assert.equal(frame(movement, reply, 800, controls).started, true);
  assert.equal(requests[1].id, requests[0].id + 1);
  const resume = new LocalMovement("p", () => {});
  const retained = structuredClone(reply);
  retained.players[0].attackAt = undefined;
  frame(resume, retained, 0, { ...controls, attacking: false });
  const next = frame(resume, retained, 10, controls);
  assert.equal(
    next.player.attackId,
    retained.players[0].castSeq! + 1,
    "reconnect continues the server's ID sequence",
  );
});

test("all local attacks stop on stale or paused snapshots and resume from fresh server state", () => {
  for (const training of [false, true]) {
    for (const classId of ["warrior", "mage", "ranger", "druid"] as const) {
      const source = fixture(classId, training),
        before = structuredClone(source);
      const movement = new LocalMovement("p", () => {});
      const attack = (world: WorldState, now: number) => {
        const player = movement.render(world, now)!;
        const view = structuredClone(world);
        const started = movement.animateAttack(player, view, now);
        movement.animateProjectiles(player, view, now, started);
        return { player, started, scene: (training ? view.training : view.scene)! };
      };
      attack(source, 0);
      assert.equal(attack(source, 100).started, true);
      assert.notEqual(attack(source, 1000).player.attackAt, undefined);
      for (const now of [1001, 1500, 2200]) {
        const stale = attack(source, now);
        assert.equal(stale.started, false, "no new swing or slash sound without server updates");
        assert.equal(stale.player.attackAt, undefined);
        assert.equal(stale.scene.playerShots?.length ?? 0, 0);
      }
      const older = structuredClone(source);
      older.serverNow = 9950;
      assert.equal(attack(older, 2250).started, false, "an old packet cannot restart prediction");
      const fresh = structuredClone(source);
      fresh.serverNow = 12200;
      fresh.players[0].attackAt = 12200;
      const resumed = attack(fresh, 2300);
      assert.equal(resumed.started, true);
      assert.equal(resumed.player.attackAt, 2300);
      assert.equal(attack(fresh, 2316).started, false, "resume starts only one swing");
      const paused = structuredClone(fresh);
      paused.serverNow = 12250;
      (training ? paused.training : paused.scene)!.pausedAt = 12250;
      const stopped = attack(paused, 2350);
      assert.equal(stopped.started, false);
      assert.equal(stopped.player.attackAt, undefined);
      assert.equal(stopped.scene.playerShots?.length ?? 0, 0);
      assert.deepEqual(source, before);
    }
  }
});

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
  assert.equal(corrected.length, 2);
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
  assert.equal(frame(movement, source, 100).scene.playerShots!.length, 2);
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
