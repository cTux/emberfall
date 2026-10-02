import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import type { ServerMessage, WorldState } from "@emberfall/common";
import { createGameServer } from "./worlds.ts";

test("chat validates text, identifies senders, retains ten messages and isolates worlds", async () => {
  const app = createGameServer();
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert(address && typeof address !== "string");
  const port = address.port;
  const sockets: WebSocket[] = [];
  const wait = async (predicate: () => boolean) => {
    const until = Date.now() + 3000;
    while (!predicate()) {
      assert(Date.now() < until, "chat timed out");
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  };
  async function connect() {
    const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
    sockets.push(ws);
    const messages: ServerMessage[] = [];
    let world: WorldState | undefined;
    ws.on("message", (raw) => {
      const message = JSON.parse(raw.toString()) as ServerMessage;
      messages.push(message);
      if (message.type === "joined" || message.type === "state") world = message.world;
    });
    await once(ws, "open");
    return {
      ws,
      send: (message: unknown) => ws.send(JSON.stringify(message)),
      messages,
      get world() {
        return world;
      },
    };
  }
  try {
    const alice = await connect(),
      bob = await connect(),
      outsider = await connect();
    outsider.send({ type: "chat", text: "Not joined" });
    await wait(() =>
      outsider.messages.some((m) => m.type === "error" && m.message === "Join a world first."),
    );
    alice.send({ type: "create", name: "Chat room", playerName: "Alice", password: "" });
    outsider.send({ type: "create", name: "Other room", playerName: "Eve", password: "" });
    await wait(() => !!alice.world && !!outsider.world);
    bob.send({ type: "join", worldId: alice.world!.id, playerName: "Bob", password: "" });
    await wait(() => !!bob.world);
    await wait(() => alice.world?.chat?.at(-1)?.text === "Bob joined.");
    for (const text of ["   ", "x".repeat(201), "line\nbreak", "hidden\u202econtrol"])
      alice.send({ type: "chat", text });
    await wait(() => alice.messages.filter((m) => m.type === "error").length === 4);
    assert.deepEqual(
      alice.world!.chat!.map((m) => m.text),
      ["Alice joined.", "Bob joined."],
    );
    assert(alice.world!.chat!.every((m) => m.name === "System" && m.playerId === ""));
    alice.send({ type: "chat", text: "  First message  ", playerId: "fake", name: "Fake" });
    await wait(() => bob.world?.chat?.at(-1)?.text === "First message");
    const first = bob.world!.chat!.at(-1)!;
    assert.equal(first.name, "Alice");
    assert.equal(first.playerId, alice.world!.players.find((p) => p.name === "Alice")!.id);
    alice.send({ type: "chat", text: "Too fast" });
    await wait(() =>
      alice.messages.some((m) => m.type === "error" && m.message.includes("before sending")),
    );
    for (let i = 0; i < 11; i++) {
      if (i) await new Promise((resolve) => setTimeout(resolve, 510));
      bob.send({ type: "chat", text: `Message ${i}` });
      await wait(() => alice.world?.chat?.at(-1)?.text === `Message ${i}`);
    }
    assert.equal(alice.world!.chat!.length, 10);
    assert.equal(alice.world!.chat![0].text, "Message 1");
    assert.deepEqual(alice.world!.chat, bob.world!.chat);
    assert.equal(alice.world!.players.find((p) => p.name === "Bob")!.chat, "Message 10");
    assert.equal(alice.world!.players.find((p) => p.name === "Alice")!.chat, "First message");
    assert.deepEqual(
      outsider.world!.chat!.map((m) => m.text),
      ["Eve joined."],
    );
    // Alice's older bubble expires first; Bob's latest message gets a fresh ten seconds.
    await new Promise((resolve) => setTimeout(resolve, 5000));
    await wait(() => alice.world!.players.find((p) => p.name === "Alice")!.chat === undefined);
    assert.equal(alice.world!.players.find((p) => p.name === "Bob")!.chat, "Message 10");
    await new Promise((resolve) => setTimeout(resolve, 5100));
    await wait(() => bob.world!.players.find((p) => p.name === "Bob")!.chat === undefined);
    assert.equal(bob.world!.chat!.at(-1)!.text, "Message 10");
    const joined = bob.messages.find((m) => m.type === "joined");
    assert(joined?.type === "joined");
    bob.ws.terminate();
    await wait(() => alice.world?.chat?.at(-1)?.text === "Bob disconnected.");
    assert(
      alice.world!.players.some((p) => p.name === "Bob"),
      "interruption retains membership",
    );
    const resumed = await connect();
    resumed.send({
      type: "resume",
      worldId: joined.world.id,
      characterToken: joined.characterToken,
    });
    await wait(() => resumed.world?.chat?.at(-1)?.text === "Bob joined.");
    assert.equal(resumed.world!.players.find((p) => p.name === "Bob")!.id, joined.playerId);
    assert.equal(alice.world!.chat!.filter((m) => m.text === "Bob disconnected.").length, 1);
    resumed.ws.close(1000);
    await wait(() => alice.world?.players.length === 1);
    assert.equal(alice.world!.chat!.at(-1)?.text, "Bob disconnected.");
    assert.equal(alice.world!.chat!.filter((m) => m.text === "Bob disconnected.").length, 2);
    assert.equal(alice.world!.players.find((p) => p.name === "Alice")!.chat, undefined);
  } finally {
    sockets.forEach((ws) => ws.terminate());
    await app.close();
  }
});
