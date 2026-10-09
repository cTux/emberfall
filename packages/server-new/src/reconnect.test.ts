import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "./testing/socket.ts";
import type { ServerMessage } from "@emberfall/common-new";
import { createGameServer } from "./worlds.ts";

test("resume authenticates retained sessions, rejects live takeover, expires and cleans up", async (t) => {
  t.mock.timers.enable({ apis: ["Date"], now: Date.now() });
  const app = await createGameServer();
  await app.listen(0, "127.0.0.1");
  const address = app.server.address();
  assert(address && typeof address !== "string");
  const clients: WebSocket[] = [];
  const connect = async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
    clients.push(ws);
    const messages: ServerMessage[] = [];
    ws.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
    await once(ws, "open");
    return {
      ws,
      send: (message: unknown) => ws.send(JSON.stringify(message)),
      wait: async (type: ServerMessage["type"], predicate = (_message: ServerMessage) => true) => {
        const until = performance.now() + 7000;
        while (performance.now() < until) {
          const index = messages.findIndex((m) => m.type === type && predicate(m));
          if (index >= 0) return messages.splice(index, 1)[0];
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
        throw new Error(`Missing ${type}`);
      },
    };
  };
  try {
    const first = await connect();
    first.send({ type: "create", name: "Retained", playerName: "Owner", password: "secret" });
    const joined = await first.wait("joined");
    assert(joined.type === "joined");
    const resume = {
      type: "resume",
      worldId: joined.world.id,
      characterToken: joined.characterToken,
    };
    const next = await connect();
    next.send(resume);
    const live = await next.wait("error");
    assert(live.type === "error" && live.message.includes("no longer available"));
    first.ws.terminate();
    await once(first.ws, "close");
    next.send({ ...resume, characterToken: "0".repeat(64) });
    await next.wait("error");
    next.send(resume);
    const restored = await next.wait("joined");
    assert(restored.type === "joined");
    assert.equal(restored.playerId, joined.playerId);
    assert.equal(restored.world.hostId, joined.playerId);
    assert.deepEqual(
      restored.world.players,
      joined.world.players.map((p) => ({ ...p, inputX: 0, inputY: 0 })),
    );
    next.ws.terminate();
    await once(next.ws, "close");
    const observer = await connect();
    t.mock.timers.setTime(Date.now() + 31_000);
    observer.send(resume);
    const expired = await observer.wait("error");
    assert(expired.type === "error" && expired.message.includes("no longer available"));
    await observer.wait(
      "worlds",
      (m) => m.type === "worlds" && !m.worlds.some((w) => w.id === joined.world.id),
    );
  } finally {
    await app.close();
    for (const ws of clients) ws.terminate();
  }
});

test("normal transport close retains a reconnecting player for exactly ten seconds", async (t) => {
  const { createRuntime } = await import("./runtime.ts");
  const { Peer } = await import("./network/peer.ts");
  const app = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  app.connect(peer);
  peer.receive({ type: "create", name: "Grace", playerName: "Owner", password: "" });
  const joined = messages.find((m) => m.type === "joined");
  assert(joined?.type === "joined");
  const world = app.worlds.get(joined.world.id)!;
  const player = world.players.get(joined.playerId)!;
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: Date.now() });
  try {
    peer.detached(1000);
    assert.equal(player.reconnecting, true);
    assert.equal(world.chat?.at(-1)?.text, "Owner joined.");
    t.mock.timers.tick(9999);
    assert.equal(world.players.get(player.id), player);
    t.mock.timers.tick(1);
    assert.equal(world.players.size, 0);
    assert.equal(app.worlds.has(world.id), false);
  } finally {
    await app.close();
  }
});

test("resume cancels expiry and clears reconnecting; explicit leave remains immediate", async (t) => {
  const { createRuntime } = await import("./runtime.ts");
  const { Peer } = await import("./network/peer.ts");
  const app = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  app.connect(peer);
  peer.receive({ type: "create", name: "Grace", playerName: "Owner", password: "" });
  const joined = messages.find((m) => m.type === "joined");
  assert(joined?.type === "joined");
  const world = app.worlds.get(joined.world.id)!;
  const player = world.players.get(joined.playerId)!;
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: Date.now() });
  try {
    peer.detached(1005);
    t.mock.timers.tick(9000);
    const next = new Peer(
      (message) => messages.push(message),
      () => {},
    );
    app.connect(next);
    next.receive({ type: "resume", worldId: world.id, characterToken: joined.characterToken });
    assert.equal(world.players.get(player.id), player);
    assert.equal(player.reconnecting, undefined);
    assert.equal(world.chat?.length, 1);
    t.mock.timers.tick(1000);
    assert.equal(world.players.get(player.id), player);
    next.receive({ type: "leave" });
    assert.equal(world.players.size, 0);
  } finally {
    await app.close();
  }
});
