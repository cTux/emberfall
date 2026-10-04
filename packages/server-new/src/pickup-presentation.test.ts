import { test } from "node:test";
import assert from "node:assert/strict";
import { FOREST, wrappedDelta, type WorldState } from "@emberfall/common-new";
import { freshProgress } from "./characters.ts";
import { alignLocalPickups } from "../../client-new/src/pickup-presentation.ts";
import { createTrainingScene } from "@emberfall/common-new";
import { SessionState, projectState, materializeState } from "@emberfall/common-new/protocol";
import { Encoder, Decoder } from "@colyseus/schema";

test("only server-selected pickups converge on the reconciled player across a seam without rewards", () => {
  const source: WorldState = {
    id: "w",
    name: "W",
    hostId: "p",
    serverNow: 1000,
    players: [
      {
        ...freshProgress(),
        id: "p",
        name: "P",
        color: 0,
        scene: "forest",
        x: FOREST.width - 10,
        y: 500,
      },
    ],
    scene: {
      ...createTrainingScene(1000),
      training: false,
      drops: [
        { id: 1, kind: "experience", x: FOREST.width - 30, y: 500, at: 0, collectorId: "p" },
        { id: 2, kind: "gold", x: FOREST.width - 30, y: 500, at: 0, collectorId: "remote" },
        { id: 3, kind: "gold", x: FOREST.width - 30, y: 500, at: 0 },
      ],
    },
  };
  const state = new SessionState();
  projectState(state, source);
  const received = new SessionState();
  new Decoder(received).decode(new Encoder(state).encodeAll());
  const view = materializeState(received)!;
  const local = { ...view.players[0], x: 60 };
  alignLocalPickups(view, local);
  assert.equal(wrappedDelta(local.x, view.scene!.drops![0].x, FOREST.width), 20);
  assert.equal(view.scene!.drops![1].x, source.scene!.drops![1].x);
  assert.equal(view.scene!.drops![2].x, source.scene!.drops![2].x);
  assert.equal(local.experience, 0);
  assert.equal(source.scene!.drops![0].x, FOREST.width - 30);
  assert.equal(view.scene!.drops!.length, 3);
});
