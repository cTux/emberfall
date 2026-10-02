import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalEffects } from "../../client/src/local-effects.ts";
import { SnapshotBuffer } from "../../client/src/snapshots.ts";
import { fireClassAttack } from "../../common/src/class-combat.ts";
import { FOREST, wrappedDelta } from "@emberfall/common";
import type { Player, WorldState } from "@emberfall/common";

function world(): WorldState {
  return {
    id: "room",
    name: "R",
    hostId: "p",
    serverNow: 10000,
    players: [
      {
        id: "p",
        name: "P",
        classId: "ranger",
        scene: "forest",
        x: 2400,
        y: 1280,
        color: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        manapoints: 50,
        maxManapoints: 50,
        level: 1,
        experience: 0,
        playtimeSeconds: 0,
        attackAt: 10000,
      },
    ],
    scene: {
      id: "forest",
      type: "Forest",
      difficulty: "Easy",
      phase: "active",
      ready: [],
      countdownAt: null,
      endsAt: 90000,
      sequence: 0,
      nextSpawn: 90000,
      portals: [],
      damage: [],
      enemies: [{ id: 1, x: 2600, y: 1280, hitpoints: 10, angle: 0 }],
      drops: [],
      playerShots: [],
    },
  };
}
const copy = (w: WorldState) => structuredClone(w);

test("a shot already confirmed on the attack frame still launches from the displayed player", () => {
  const latest = world(),
    effects = new LocalEffects();
  fireClassAttack(latest.scene!, latest.players[0], 10000);
  const view = copy(latest);
  effects.render(view, latest, { ...latest.players[0], x: 2500 }, true, 10000, 0);
  assert.equal(view.scene!.playerShots!.length, 1);
  assert.equal(view.scene!.playerShots![0].x, 2500);
});

test("local shots launch at the displayed player, fly independently, reconcile once and never damage", () => {
  const latest = world(),
    effects = new LocalEffects();
  const player: Player = { ...latest.players[0], x: 2500 };
  const original = copy(latest);
  let view = copy(latest);
  effects.render(view, latest, player, true, 10000, 0);
  assert.equal(view.scene!.playerShots![0].x, 2500);
  view = copy(latest);
  player.x = 2530;
  effects.render(view, latest, player, false, 10000, 50);
  assert.equal(
    view.scene!.playerShots![0].x,
    2530,
    "arrow advances 30 units, not player displacement plus 30",
  );
  fireClassAttack(latest.scene!, latest.players[0], 10000);
  latest.serverNow = 10050;
  view = copy(latest);
  effects.render(view, latest, player, false, 10000, 50);
  assert.equal(
    view.scene!.playerShots!.length,
    1,
    "confirmed volley replaces its predicted visual",
  );
  assert.equal(
    view.scene!.playerShots![0].x,
    2530,
    "confirmation keeps the displayed position continuous",
  );
  player.x = 2700;
  view = copy(latest);
  effects.render(view, latest, player, false, 10000, 100);
  assert(
    view.scene!.playerShots![0].x < 2560,
    "existing arrow is not attached to the moving player",
  );
  latest.scene!.playerShots = [];
  latest.serverNow = 10100;
  view = copy(latest);
  effects.render(view, latest, player, false, 10000, 100);
  assert.equal(view.scene!.playerShots!.length, 0, "confirmed impact/removal removes the visual");
  assert.deepEqual(latest.scene!.enemies, original.scene!.enemies);
  assert.deepEqual(latest.players, original.players);
  assert.deepEqual(latest.scene!.damage, []);
});

test("mage volleys reconcile by slot even if the server selected different targets", () => {
  const latest = world(),
    effects = new LocalEffects();
  latest.players[0].classId = "mage";
  latest.scene!.enemies.push({ id: 2, x: 2640, y: 1280, hitpoints: 10, angle: 0 });
  const player = { ...latest.players[0], x: 2670 };
  let view = copy(latest);
  effects.render(view, latest, player, true, 10000, 0);
  assert.equal(view.scene!.playerShots!.length, 2);
  fireClassAttack(latest.scene!, latest.players[0], 10000);
  view = copy(latest);
  effects.render(view, latest, player, false, 10000, 50);
  assert.equal(view.scene!.playerShots!.length, 2);
  assert.deepEqual(
    view.scene!.playerShots!.map((s) => s.targetId),
    [1, 2],
  );
});

test("confirmed shots cannot repeatedly respawn from a frozen snapshot after exhausting their range", () => {
  const latest = world(),
    effects = new LocalEffects();
  fireClassAttack(latest.scene!, latest.players[0], 10000);
  let view = copy(latest);
  for (let now = 0; now <= 3000; now += 50) {
    view = copy(latest);
    effects.render(view, latest, latest.players[0], now === 0, 10000, now);
    if (now >= 2000) assert.equal(view.scene!.playerShots!.length, 0);
  }
});

test("unconfirmed shots expire after rejection, and scene transfers discard local effects", () => {
  const latest = world(),
    effects = new LocalEffects(),
    player = latest.players[0];
  effects.render(copy(latest), latest, player, true, 10000, 0);
  latest.serverNow = 10400;
  let view = copy(latest);
  effects.render(view, latest, player, false, 10000, 400);
  assert.equal(view.scene!.playerShots!.length, 0);
  effects.render(copy(latest), latest, player, true, 10400, 400);
  latest.scene!.id = "other";
  view = copy(latest);
  effects.render(view, latest, player, false, 10400, 450);
  assert.equal(view.scene!.playerShots!.length, 0);
});

test("attracted loot follows the displayed collector across wrapping, finishes after server removal and stays immutable", () => {
  const latest = world(),
    effects = new LocalEffects();
  latest.players[0].x = FOREST.width - 100;
  const player = { ...latest.players[0], x: 10 };
  latest.scene!.drops = [
    { id: 5, kind: "gold", x: FOREST.width - 60, y: 1280, at: 9000, collectorId: "p" },
  ];
  const original = copy(latest);
  let view = copy(latest);
  effects.render(view, latest, player, false, 10000, 0);
  view = copy(latest);
  effects.render(view, latest, player, false, 10000, 50);
  assert.equal(
    wrappedDelta(view.scene!.drops![0].x, original.scene!.drops![0].x, FOREST.width),
    14,
  );
  assert.deepEqual(latest, original);
  latest.scene!.drops = [];
  for (let now = 100; now <= 300; now += 50) {
    view = copy(original);
    effects.render(view, latest, player, false, 10000, now);
  }
  assert.equal(
    view.scene!.drops!.length,
    0,
    "buffered drop cannot reappear after finishing its flight",
  );
  assert.equal(player.experience, 0);
});

test("collector reassignment restores server presentation without stealing another player's loot", () => {
  const latest = world(),
    effects = new LocalEffects(),
    player = { ...latest.players[0], x: 2450 };
  latest.scene!.drops = [{ id: 5, kind: "gold", x: 2440, y: 1280, at: 9000, collectorId: "p" }];
  let view = copy(latest);
  effects.render(view, latest, player, false, 10000, 0);
  assert.equal(view.scene!.drops!.length, 0);
  latest.scene!.drops[0].collectorId = "other";
  view = copy(latest);
  effects.render(view, latest, player, false, 10000, 50);
  assert.equal(view.scene!.drops!.length, 1);
});

test("snapshot age includes local interpolation and time without packets, independently of ping", () => {
  const snapshots = new SnapshotBuffer("p");
  snapshots.push(world(), 0);
  assert.equal(snapshots.age(0), 100);
  snapshots.render(250);
  assert.equal(snapshots.age(250), 250);
});
