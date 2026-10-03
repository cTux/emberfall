import { test } from "node:test";
import assert from "node:assert/strict";
import { Encoder, Decoder } from "@colyseus/schema";
import { SessionState, projectState, materializeState } from "@emberfall/common-new/protocol";
import { createTrainingScene, type WorldState } from "@emberfall/common-new";
import { freshProgress } from "./characters.ts";

test("native patches preserve positions, membership, ordering and detached snapshots", () => {
  const source: WorldState = {
    id: "w",
    name: "World",
    hostId: "p",
    serverNow: 1000,
    players: [
      { ...freshProgress(), id: "p", name: "P", color: 0, x: 400, y: 300 },
      { ...freshProgress(), id: "q", name: "Q", color: 1, x: 420, y: 300 },
    ],
    training: createTrainingScene(1000),
  };
  const state = new SessionState(),
    received = new SessionState();
  const encoder = new Encoder(state),
    decoder = new Decoder(received);
  projectState(state, source);
  const full = encoder.encodeAll();
  decoder.decode(full);
  encoder.discardChanges();
  const original = materializeState(received)!;
  projectState(state, source);
  assert.equal(encoder.encode().length, 0, "unchanged state sends no delta");
  source.players[0].x += 9;
  source.serverNow = 1050;
  projectState(state, source);
  const delta = encoder.encode();
  assert(
    delta.length < full.length / 10,
    `coordinate delta ${delta.length} bytes vs full state ${full.length}`,
  );
  decoder.decode(delta);
  encoder.discardChanges();
  assert.equal(materializeState(received)!.players[0].x, 409);
  assert.equal(
    original.players[0].x,
    400,
    "interpolation history cannot change under a later patch",
  );
  Object.assign(source.players[0], {
    attackAngle: -0.5,
    inputSeq: 42,
    inputElapsed: 25,
    inputAt: 1_800_000_000_050,
  });
  source.training!.enemies[0].angle = 1.25;
  projectState(state, source);
  decoder.decode(encoder.encode());
  encoder.discardChanges();
  const acknowledged = materializeState(received)!.players[0];
  assert.equal(materializeState(received)!.training!.enemies[0].angle, 1.25);
  assert.equal(acknowledged.attackAngle, -0.5);
  assert.equal(acknowledged.inputSeq, 42);
  assert.equal(acknowledged.inputElapsed, 25);
  assert.equal(acknowledged.inputAt, 1_800_000_000_050);
  delete source.players[0].attackAngle;
  delete source.players[0].inputElapsed;
  projectState(state, source);
  decoder.decode(encoder.encode());
  encoder.discardChanges();
  assert.equal(materializeState(received)!.players[0].attackAngle, undefined);
  assert.equal(materializeState(received)!.players[0].inputElapsed, undefined);
  source.players.reverse();
  source.training!.enemies.splice(0, 3);
  projectState(state, source);
  decoder.decode(encoder.encode());
  encoder.discardChanges();
  assert.deepEqual(
    materializeState(received)!.players.map((p) => p.id),
    ["q", "p"],
  );
  assert.equal(materializeState(received)!.training!.enemies.length, 4);
  source.training = undefined;
  source.players = [];
  projectState(state, source);
  decoder.decode(encoder.encode());
  encoder.discardChanges();
  assert.equal(received.entities.size, 0);
  assert.equal(materializeState(received)!.training, undefined);
});
