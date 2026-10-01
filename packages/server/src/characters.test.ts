import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { WebSocket } from "ws";
import type { ServerMessage } from "@emberfall/common";
import { CharacterStore } from "./characters.ts";
import { createGameServer } from "./worlds.ts";

test("server saves survive restart, authenticate independently of nickname, and reject forged progress", async () => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-save-test-"));
  const path = join(directory, "characters.sqlite");
  let app = createGameServer(undefined, path);
  const clients: WebSocket[] = [];
  const listen = async () => {
    app.server.listen(0, "127.0.0.1");
    await once(app.server, "listening");
  };
  async function connect() {
    const address = app.server.address();
    assert(address && typeof address !== "string");
    const ws = new WebSocket(`ws://127.0.0.1:${address.port}/ws`);
    clients.push(ws);
    const messages: ServerMessage[] = [];
    ws.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
    await once(ws, "open");
    return {
      ws,
      send: (message: unknown) => ws.send(JSON.stringify(message)),
      wait: async (type: ServerMessage["type"]) => {
        for (let i = 0; i < 700; i++) {
          const index = messages.findIndex((m) => m.type === type);
          if (index >= 0) return messages.splice(index, 1)[0];
          await new Promise((r) => setTimeout(r, 10));
        }
        throw new Error(`Missing ${type}`);
      },
    };
  }
  try {
    await listen();
    const first = await connect();
    first.send({ type: "create", name: "One", playerName: "Hero", password: "" });
    const joined = await first.wait("joined");
    assert(joined.type === "joined");
    const token = joined.characterToken;
    first.send({ type: "selectClass", classId: "mage", experience: 99999 });
    const distantSwitch = await first.wait("error");
    assert(distantSwitch.type === "error" && distantSwitch.message.includes("wardrobe"));
    await first.wait("saved");
    const duplicate = await connect();
    duplicate.send({
      type: "create",
      name: "Duplicate",
      playerName: "Imposter",
      password: "",
      characterToken: token,
    });
    const denied = await duplicate.wait("error");
    assert(denied.type === "error" && denied.message.includes("already playing"));
    await first.wait("saved");
    const autosaved = new CharacterStore(path);
    assert(autosaved.load(token).progress.playtimeSeconds >= 4);
    autosaved.close();
    first.send({ type: "leave" });
    await first.wait("left");
    await app.close();
    const store = new CharacterStore(path);
    const saved = store.load(token);
    assert(saved.progress.playtimeSeconds >= 1);
    // Simulate a future server-side combat reward; clients never get a progress-write endpoint.
    store.save(saved.id, "Hero", {
      ...saved.progress,
      level: 4,
      experience: 321,
      hitpoints: 77,
      manapoints: 14,
    });
    assert.throws(() => store.save(saved.id, "Hero", { ...saved.progress, level: -1 }));
    assert.throws(() => store.load("0".repeat(64)));
    store.close();
    assert(!(await readFile(path)).includes(Buffer.from(token)));
    app = createGameServer(undefined, path);
    await listen();
    const returning = await connect();
    returning.send({
      type: "create",
      name: "Two",
      playerName: "Renamed hero",
      password: "",
      characterToken: token,
      level: 9999,
      experience: 9999,
    });
    const restored = await returning.wait("joined");
    assert(restored.type === "joined");
    const player = restored.world.players[0];
    assert.equal(player.name, "Renamed hero");
    assert.equal(player.level, 4);
    assert.equal(player.experience, 321);
    assert.equal(player.hitpoints, 77);
    assert.equal(player.manapoints, 14);
    assert(player.playtimeSeconds >= 1);
    const stranger = await connect();
    stranger.send({
      type: "join",
      worldId: restored.world.id,
      playerName: "Renamed hero",
      password: "",
    });
    const independent = await stranger.wait("joined");
    assert(independent.type === "joined");
    assert.notEqual(independent.characterToken, token);
    assert.equal(independent.world.players.find((p) => p.id === independent.playerId)?.level, 1);
    assert(!JSON.stringify(await returning.wait("state")).includes(token));
  } finally {
    for (const ws of clients) ws.terminate();
    await app.close();
    assert(directory.startsWith(join(tmpdir(), "emberfall-save-test-")));
    await rm(directory, { recursive: true, force: true });
  }
});
