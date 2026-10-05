import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { WebSocket } from "./testing/socket.ts";
import type { ServerMessage } from "@emberfall/common-new";
import { CLASS_IDS } from "@emberfall/common-new";
import { CharacterStore, freshProgress } from "./characters.ts";
import { createGameServer } from "./worlds.ts";

test("server saves survive restart, authenticate independently of nickname, and reject forged progress", async () => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-save-test-"));
  const path = join(directory, "characters.sqlite");
  let app = await createGameServer(undefined, path);
  const clients: WebSocket[] = [];
  const listen = async () => {
    await app.listen(0, "127.0.0.1");
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
    await autosaved.ready;
    assert(autosaved.load(token).progress.playtimeSeconds >= 4);
    autosaved.close();
    first.send({ type: "leave" });
    await first.wait("left");
    await app.close();
    const store = new CharacterStore(path);
    await store.ready;
    const saved = store.load(token);
    assert(saved.progress.playtimeSeconds >= 1);
    // Simulate a future server-side combat reward; clients never get a progress-write endpoint.
    store.save(saved.id, "Hero", {
      ...saved.progress,
      level: 4,
      experience: 321,
      hitpoints: 77,
      equipment: {},
    });
    assert.throws(() => store.save(saved.id, "Hero", { ...saved.progress, level: -1 }));
    assert.throws(() => store.load("0".repeat(64)));
    store.close();
    assert(!(await readFile(path)).includes(Buffer.from(token)));
    app = await createGameServer(undefined, path);
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
      equipment: { weapon: "mage-staff" },
    });
    const restored = await returning.wait("joined");
    assert(restored.type === "joined");
    const player = restored.world.players[0];
    assert.equal(player.name, "Renamed hero");
    assert.equal(player.level, 4);
    assert.equal(player.experience, 321);
    assert.equal(player.hitpoints, 77);
    assert(!("manapoints" in player));
    assert(!("maxManapoints" in player));
    assert.deepEqual(
      player.equipment,
      {},
      "empty saved equipment survives restart and ignores forged gear",
    );
    assert.deepEqual(player.classes?.mage.equipment, { weapon: "mage-staff" });
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

test("old single-class and per-class saves discard mana without losing progress", async () => {
  const store = new CharacterStore(":memory:");
  await store.ready;
  try {
    const legacy = {
      ...freshProgress(),
      experience: 87.5,
      hitpoints: 77,
      manapoints: 14,
      maxManapoints: 50,
    };
    for (const raw of [
      legacy,
      {
        formatVersion: 1,
        classId: "mage",
        classes: Object.fromEntries(CLASS_IDS.map((id) => [id, legacy])),
      },
    ]) {
      const created = store.create("Hero");
      const save = (await store.database.saves.load(created.id))!;
      await store.database.saves.save(created.id, raw, 0, save.version);
      const loaded = store.load(created.token);
      assert.equal(loaded.progress.experience, 87.5);
      assert.equal(loaded.progress.hitpoints, 77);
      for (const progress of Object.values(loaded.classes)) {
        assert(!("manapoints" in progress));
        assert(!("maxManapoints" in progress));
      }
      store.save(created.id, loaded.name, {
        ...loaded.progress,
        classId: loaded.classId,
        classes: loaded.classes,
      });
      const saved = (await store.database.saves.load(created.id))!;
      assert(!/mana/i.test(JSON.stringify(saved.data)));
    }
  } finally {
    store.close();
  }
});
