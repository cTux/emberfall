import { test } from "node:test";
import assert from "node:assert/strict";
import { createGameServer } from "./worlds.ts";
import { Peer } from "./network/peer.ts";
import type { ServerMessage } from "@emberfall/common-new";

test("shutdown attempts every save and closes resources even when one save fails", async () => {
  const game = await createGameServer();
  await game.listen(0);
  const peers: Peer[] = [];
  for (const name of ["First", "Second"]) {
    const messages: ServerMessage[] = [];
    const peer = new Peer(
      (message) => messages.push(message),
      () => {},
    );
    peers.push(peer);
    game.runtime.connect(peer);
    peer.receive({ type: "create", name, playerName: name, password: "" });
    const deadline = Date.now() + 3000;
    while (!messages.some((message) => message.type === "joined")) {
      assert(Date.now() < deadline, "create timed out");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  const save = game.runtime.characters.save.bind(game.runtime.characters);
  const attempted: string[] = [];
  game.runtime.characters.save = (id, name, progress) => {
    attempted.push(name);
    if (name === "First") throw new Error("Injected write failure");
    return save(id, name, progress);
  };
  await assert.rejects(game.close(), AggregateError);
  assert.deepEqual(attempted, ["First", "Second"]);
  assert(peers.every((peer) => peer.readyState === Peer.CLOSED));
  assert.equal(game.server.listening, false);
  assert.throws(() => game.runtime.characters.worlds(), /not open/);
});
