import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { WebSocket } from "ws";
import type { Player, ServerMessage } from "@emberfall/common";
import { TREES, moveActor } from "@emberfall/common";
import { createGameServer } from "./worlds.ts";

test("latest input is coalesced, held between packets, timed out and rejected across areas", async () => {
  const app = createGameServer();
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert(address && typeof address !== "string");
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
  const samples: Player[] = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString()) as ServerMessage;
    if (m.type === "state" || m.type === "joined") samples.push(m.world.players[0]);
  });
  const wait = async (predicate: () => boolean) => {
    const until = Date.now() + 3000;
    while (!predicate()) {
      assert(Date.now() < until, "timed out");
      await new Promise((r) => setTimeout(r, 10));
    }
  };
  try {
    await once(ws, "open");
    ws.send(
      JSON.stringify({ type: "create", name: "Sequence test", playerName: "Tester", password: "" }),
    );
    await wait(() => samples.length > 0);
    for (let seq = 1; seq <= 4; seq++)
      ws.send(JSON.stringify({ type: "move", seq, epoch: "lobby", x: 1, y: 0 }));
    ws.send(JSON.stringify({ type: "move", seq: 4, epoch: "lobby", x: -1, y: 0 }));
    await wait(() => samples.some((p) => p.inputSeq === 4));
    const first = samples.find((p) => p.inputSeq === 4)!;
    assert.equal(first.x, 429, "a burst must consume only one movement step");
    await new Promise((r) => setTimeout(r, 380));
    const stopped = samples.at(-1)!;
    assert(stopped.x > first.x, "direction persists between heartbeats");
    assert(stopped.x <= 465, "missing heartbeat stops movement after 250ms");
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(samples.at(-1)!.x, stopped.x);
    ws.send(JSON.stringify({ type: "move", seq: 5, epoch: "old-scene", x: 1, y: 0 }));
    await wait(() => samples.some((p) => p.inputSeq === 5));
    assert.equal(samples.at(-1)!.x, stopped.x);
    ws.send(JSON.stringify({ type: "move", seq: 6, epoch: "lobby", x: 0, y: 0 }));
    await wait(() => samples.some((p) => p.inputSeq === 6));
    assert.equal(samples.at(-1)!.x, stopped.x);
  } finally {
    ws.terminate();
    await app.close();
  }
});

test("the server prevents a connected player from walking through a tree", async () => {
  const app = createGameServer();
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert(address && typeof address !== "string");
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
  let player: Player | undefined;
  const samples: Player[] = [];
  ws.on("message", (raw) => {
    const message = JSON.parse(raw.toString()) as ServerMessage;
    if (message.type === "joined" || message.type === "state") {
      player = message.world.players[0];
      samples.push(player);
    }
  });
  try {
    await once(ws, "open");
    ws.send(
      JSON.stringify({
        type: "create",
        name: "Collision check",
        playerName: "Walker",
        password: "",
      }),
    );
    const tree = [...TREES].sort(
      (a, b) => Math.hypot(a.x - 420, a.y - 363) - Math.hypot(b.x - 420, b.y - 363),
    )[0];
    for (let i = 0; i < 70; i++) {
      if (player) {
        const dx = tree.x - player.x;
        const dy = tree.y - 8 - (player.y + 15);
        const length = Math.max(1, Math.hypot(dx, dy));
        ws.send(JSON.stringify({ type: "move", x: dx / length, y: dy / length }));
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    assert(player);
    assert(samples.length > 30);
    assert(Math.hypot(player.x - tree.x, player.y + 15 - (tree.y - 8)) < 38);
    for (const sample of samples)
      for (const obstacle of TREES) {
        assert(
          Math.hypot(sample.x - obstacle.x, sample.y + 15 - (obstacle.y - 8)) >=
            12 + obstacle.radius,
        );
      }
  } finally {
    ws.terminate();
    await app.close();
  }
});

test("tree trunks block player and enemy bodies, including fast movement, with sliding", () => {
  const tree = TREES.find(
    (t) =>
      t.x > 100 &&
      t.x < 800 &&
      t.y > 100 &&
      TREES.every((other) => other === t || Math.hypot(other.x - t.x, other.y - t.y) > 80),
  );
  assert(tree);
  for (const radius of [12, 18]) {
    const start: { x: number; y: number } = {
      x: tree.x - tree.radius - radius - 10,
      y: tree.y - 8,
    };
    const blocked = moveActor(start, 200, 0, radius);
    assert(blocked.x < tree.x - tree.radius - radius);
    assert(blocked.x > start.x);
    const slide = moveActor({ x: blocked.x, y: blocked.y }, 9, 9, radius);
    assert(slide.y > blocked.y);
    assert(Math.hypot(slide.x - tree.x, slide.y - (tree.y - 8)) >= radius + tree.radius);
    const free = moveActor({ x: 480, y: 335 }, 9, 0, radius);
    assert.deepEqual(free, { x: 489, y: 335 });
  }
});

test("world lifecycle, passwords, movement, capacity and isolation over real sockets", async () => {
  const app = createGameServer();
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert(address && typeof address !== "string");
  const clients: WebSocket[] = [];
  async function connect() {
    const ws = new WebSocket(
      `ws://127.0.0.1:${address && typeof address !== "string" ? address.port : 0}/ws`,
    );
    const messages: ServerMessage[] = [];
    ws.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
    clients.push(ws);
    await once(ws, "open");
    async function wait(predicate: (m: ServerMessage) => boolean): Promise<ServerMessage> {
      const until = Date.now() + 3000;
      while (Date.now() < until) {
        const i = messages.findIndex(predicate);
        if (i >= 0) return messages.splice(i, 1)[0];
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error("Timed out waiting for server message");
    }
    return { ws, messages, wait, send: (message: unknown) => ws.send(JSON.stringify(message)) };
  }
  try {
    const host = await connect();
    const guest = await connect();
    host.send({ type: "create", name: "Test grove", playerName: "Host", password: "secret" });
    const joined = await host.wait((m) => m.type === "joined");
    assert(joined.type === "joined");
    const id = joined.world.id;
    const listing = await guest.wait((m) => m.type === "worlds" && m.worlds.length === 1);
    assert(!JSON.stringify(listing).includes("secret"));
    guest.send({ type: "join", worldId: id, playerName: "Guest", password: "wrong" });
    const error = await guest.wait((m) => m.type === "error");
    assert(error.type === "error" && error.message.includes("Incorrect"));
    guest.send({ type: "join", worldId: id, playerName: "Guest", password: "secret" });
    const other = await guest.wait((m) => m.type === "joined");
    assert(other.type === "joined");
    assert.equal(other.world.players.length, 2);
    guest.send({ type: "move", x: 500, y: 0 });
    await guest.wait((m) => m.type === "error");
    guest.send({ type: "move", x: 1, y: 0 });
    await host.wait(
      (m) =>
        m.type === "state" &&
        m.world.players.some((p) => p.id === other.playerId && p.x > other.world.players[1].x),
    );
    host.ws.close();
    await guest.wait(
      (m) =>
        m.type === "state" && m.world.hostId === other.playerId && m.world.players.length === 1,
    );
    for (let i = 0; i < 7; i++) {
      const c = await connect();
      c.send({ type: "join", worldId: id, playerName: `Player ${i}`, password: "secret" });
      await c.wait((m) => m.type === "joined");
    }
    const excess = await connect();
    excess.send({ type: "join", worldId: id, playerName: "Extra", password: "secret" });
    const full = await excess.wait((m) => m.type === "error");
    assert(full.type === "error" && full.message.includes("full"));
    excess.send({ type: "create", name: "Other world", playerName: "Extra", password: "" });
    const isolated = await excess.wait((m) => m.type === "joined");
    assert(isolated.type === "joined");
    assert.equal(isolated.world.players.length, 1);
    excess.messages.length = 0;
    await excess.wait((m) => m.type === "state");
    assert(excess.messages.every((m) => m.type !== "state" || m.world.id !== id));
    for (const ws of clients) if (ws !== excess.ws) ws.close();
    await excess.wait((m) => m.type === "worlds" && !m.worlds.some((w) => w.id === id));
    excess.send({ type: "leave" });
    await excess.wait((m) => m.type === "left");
    await excess.wait((m) => m.type === "worlds" && m.worlds.length === 0);
    excess.send({ type: "create", name: " ", playerName: "Extra", password: "" });
    await excess.wait((m) => m.type === "error");
    excess.send({ type: "join", worldId: id, playerName: "Extra", password: "secret" });
    const closed = await excess.wait((m) => m.type === "error");
    assert(closed.type === "error" && closed.message.includes("closed"));
  } finally {
    for (const ws of clients) ws.terminate();
    await app.close();
  }
});

test("timed inputs acknowledge partial steps, reject stale areas and cannot accelerate the server", async () => {
  const app = createGameServer();
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert(address && typeof address !== "string");
  const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
  const samples: Player[] = [];
  ws.on("message", (raw) => {
    const m = JSON.parse(raw.toString()) as ServerMessage;
    if (m.type === "state" || m.type === "joined") samples.push(m.world.players[0]);
  });
  const wait = async (predicate: () => boolean) => {
    const until = Date.now() + 3000;
    while (!predicate()) {
      assert(Date.now() < until, "timed out");
      await new Promise((r) => setTimeout(r, 10));
    }
  };
  try {
    await once(ws, "open");
    ws.send(
      JSON.stringify({ type: "create", name: "Sequence test", playerName: "Tester", password: "" }),
    );
    await wait(() => samples.length > 0);
    ws.send(JSON.stringify({ type: "move", seq: 1, epoch: "lobby", x: 1, y: 0, durationMs: 20 }));
    ws.send(JSON.stringify({ type: "move", seq: 2, epoch: "lobby", x: 1, y: 0, durationMs: 40 }));
    await wait(() => samples.some((p) => p.inputSeq === 2 && p.inputElapsed === 40));
    const partial = samples.find((p) => p.inputSeq === 2 && p.inputElapsed === 30);
    assert(partial, "first tick consumes 20ms + 30ms, not two complete commands");
    assert.equal(partial.x, 429);
    assert(Math.abs(samples.at(-1)!.x - 430.8) < 0.001);
    const stopped = samples.at(-1)!.x;
    await new Promise((r) => setTimeout(r, 100));
    assert.equal(samples.at(-1)!.x, stopped, "acknowledged duration is never applied twice");
    ws.send(JSON.stringify({ type: "move", seq: 3, epoch: "expired", x: 1, y: 0, durationMs: 50 }));
    await wait(() => samples.some((p) => p.inputSeq === 3));
    assert.equal(samples.at(-1)!.x, stopped);
    for (let seq = 4; seq <= 13; seq++)
      ws.send(JSON.stringify({ type: "move", seq, epoch: "lobby", x: 1, y: 0, durationMs: 50 }));
    await wait(() => samples.some((p) => p.inputSeq === 13));
    for (let i = 1; i < samples.length; i++) assert(samples[i].x - samples[i - 1].x <= 9.001);
  } finally {
    ws.terminate();
    await app.close();
  }
});
