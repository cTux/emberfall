import { movementFacing } from "../../client/src/facing.ts";
import { test } from "node:test";
import assert from "node:assert/strict";
import { LocalMovement } from "../../client/src/local-movement.ts";
import { FOREST, movePlayer } from "@emberfall/common";
import type { WorldState, Player, ClientMessage } from "@emberfall/common";
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
const world = (player = hero, time = 10000): WorldState => ({
  id: "room",
  name: "R",
  hostId: "p",
  players: [{ ...player }],
  serverNow: time,
});

test("local input is instant and partial acknowledgements replay exactly the remaining duration", () => {
  const sent: ClientMessage[] = [];
  const movement = new LocalMovement("p", (m) => sent.push(m));
  const initial = world();
  movement.render(initial, 0);
  movement.input(1, 0, 0);
  assert.equal(movement.render(initial, 10)!.x, 421.8);
  assert.equal(movement.render(initial, 100)!.x, 438);
  assert.equal(sent.length, 2);
  assert.equal(movement.inputDelay(190), 90, "pending input age grows independently of ping");
  const partial = world({ ...hero, x: 424.5, inputSeq: 1, inputElapsed: 25 }, 10050);
  assert.equal(movement.render(partial, 100)!.x, 438);
  const confirmed = world({ ...hero, x: 438, inputSeq: 2, inputElapsed: 50 }, 10100);
  assert.equal(movement.render(confirmed, 100)!.x, 438);
  assert.equal(
    movement.inputDelay(100),
    0,
    "the latest consumed command records acknowledgement delay",
  );
  movement.input(0, 0, 100);
  assert.equal(movement.render(confirmed, 110)!.x, 438);
  assert.equal(hero.x, 420, "source state stays immutable");
});

test("small visual errors stay still, accumulated error converges, large corrections and death snap", () => {
  const movement = new LocalMovement("p", () => {});
  movement.render(world(), 0);
  assert.equal(movement.render(world({ ...hero, x: 419 }, 10050), 50)!.x, 420);
  assert.equal(movement.render(world({ ...hero, x: 418 }, 10100), 100)!.x, 420);
  const corrected = world({ ...hero, x: 414 }, 10150);
  const blended = movement.render(corrected, 150)!.x;
  assert(blended > 414 && blended < 420);
  for (let now = 200; now <= 600; now += 50) movement.render(corrected, now);
  assert(movement.render(corrected, 650)!.x <= 416);
  assert.equal(movement.render(world({ ...hero, x: 350 }, 10200), 700)!.x, 350);
  assert.equal(movement.render(world({ ...hero, x: 345, hitpoints: 0 }, 10250), 750)!.x, 345);
});

test("prediction passes through scenery and stops movement and animation on missing replies", () => {
  const start = { ...hero, x: 440, y: 380 };
  const initial = world(start);
  const movement = new LocalMovement("p", () => {});
  movement.render(initial, 0);
  movement.input(0, 1, 0);
  let player = start;
  for (let now = 50; now <= 2000; now += 50) player = movement.render(initial, now)!;
  const expected = { ...start };
  movePlayer(expected, 0, 1, 1);
  assert(Math.abs(player.y - expected.y) < 6);
  assert.equal(player.inputY, 0);
  assert.equal(player.y, 560);
  const still = movement.render(initial, 3000)!;
  assert.equal(still.y, player.y);
});

test("forest prediction wraps and resets on area changes without predicting damage", () => {
  const forest = world({ ...hero, scene: "forest", x: FOREST.width - 4, y: 1280 });
  forest.scene = { id: "forest", phase: "active", enemies: [] } as unknown as NonNullable<
    WorldState["scene"]
  >;
  const movement = new LocalMovement("p", () => {});
  movement.render(forest, 0);
  movement.input(1, 0, 0);
  const p = movement.render(forest, 50)!;
  assert.equal(p.x, 5);
  assert.equal(p.hitpoints, 100);
  movement.animateAttack(p, forest, 50);
  assert.equal(p.attackAt, 0);
  assert.equal(movement.render(world(), 100)!.x, 420);
});

test("stale movement stops walking animation and fresh acknowledgements restore it", () => {
  const initial = world({ ...hero, scene: "forest", x: 2400, y: 1280 });
  initial.scene = { id: "forest", phase: "active", enemies: [] } as unknown as NonNullable<
    WorldState["scene"]
  >;
  const movement = new LocalMovement("p", () => {});
  movement.render(initial, 0);
  movement.input(1, 0, 0);
  for (let now = 50; now <= 1000; now += 50) movement.render(initial, now);
  const stopped = movement.render(initial, 1001)!;
  assert.equal(stopped.inputX, 0);
  assert.equal(stopped.inputY, 0);
  assert.equal(movement.render(initial, 2000)!.x, stopped.x);
  const fresh = world(
    { ...initial.players[0], x: stopped.x, inputSeq: 20, inputElapsed: 50 },
    11000,
  );
  fresh.scene = initial.scene;
  assert(movement.render(fresh, 2000)!.inputX! > 0);
  assert(movement.render(fresh, 2050)!.x > stopped.x);
});

test("diagonal facing keeps its current axis despite floating-point noise and follows real direction changes", () => {
  for (const start of [1, 2]) {
    let facing = start;
    for (let i = 0; i < 100; i++) {
      facing = movementFacing(-1, -1 + (i % 2 ? 1e-10 : -1e-10), facing);
      assert.equal(facing, start);
    }
  }
  assert.equal(movementFacing(0, -1, 2), 1);
  assert.equal(movementFacing(-1, 0, 1), 2);
  assert.equal(movementFacing(1, 1, 2), 3);
  assert.equal(movementFacing(0, 0, 3), 3);
});

test("attack aim follows a new nearest target before the next swing and uses server swing phase", () => {
  const initial = world({ ...hero, scene: "forest", x: 2400, y: 1280, attackAt: 9900 });
  initial.scene = {
    id: "aim",
    phase: "active",
    enemies: [
      { id: 1, x: 2440, y: 1280, hitpoints: 10, angle: 0 },
      { id: 2, x: 2300, y: 1280, hitpoints: 10, angle: 0 },
    ],
  } as unknown as NonNullable<WorldState["scene"]>;
  const movement = new LocalMovement("p", () => {});
  const player = movement.render(initial, 0)!;
  assert.equal(movement.animateAttack(player, initial, 0), true);
  assert.equal(player.attackAngle, 0);
  assert.equal(player.attackAt, -100, "render the server swing age, not a fresh local swing");
  initial.scene.enemies[1].x = 2380;
  assert.equal(movement.animateAttack(player, initial, 16), false);
  assert(player.attackAngle! > 0 && player.attackAngle! < Math.PI);
  assert.equal(player.attackAt, -100);
});
