import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { mkdtemp, writeFile, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { WebSocket } from "ws";
import type { ServerMessage } from "@emberfall/common";
import { createGameServer } from "./worlds.ts";

async function start(root?: string, savePath?: string) {
  const app = createGameServer(root, savePath);
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  const address = app.server.address();
  assert(address && typeof address !== "string");
  return { ...app, url: `http://127.0.0.1:${address.port}` };
}

async function connect(url: string) {
  const ws = new WebSocket(url.replace("http:", "ws:") + "/ws");
  const messages: ServerMessage[] = [];
  ws.on("message", (raw) => messages.push(JSON.parse(raw.toString())));
  await once(ws, "open");
  return {
    ws,
    send: (message: unknown) => ws.send(JSON.stringify(message)),
    async wait<T extends ServerMessage["type"]>(type: T) {
      const deadline = performance.now() + 3000;
      while (performance.now() < deadline) {
        const index = messages.findIndex((message) => message.type === type);
        if (index >= 0) return messages.splice(index, 1)[0] as Extract<ServerMessage, { type: T }>;
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      throw new Error(`Missing ${type}`);
    },
  };
}

test("world identities and authorized password-free recovery survive a server restart", async () => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-recovery-"));
  const savePath = join(directory, "characters.sqlite");
  let app = await start(undefined, savePath);
  try {
    const owner = await connect(app.url);
    const permanentId = (await owner.wait("worlds")).worlds[0].id;
    owner.send({ type: "create", name: "Restart grove", playerName: "Owner", password: "secret" });
    const joined = await owner.wait("joined");
    const resume = {
      type: "resume",
      worldId: joined.world.id,
      characterToken: joined.characterToken,
    };
    await app.close();
    app = await start(undefined, savePath);
    const returning = await connect(app.url);
    const listing = await returning.wait("worlds");
    assert(listing.worlds.some((world) => world.id === permanentId));
    assert(listing.worlds.some((world) => world.id === joined.world.id && world.locked));
    const stranger = await connect(app.url);
    stranger.send({ type: "join", worldId: permanentId, playerName: "Stranger", password: "" });
    const other = await stranger.wait("joined");
    const attacker = await connect(app.url);
    attacker.send({ ...resume, characterToken: other.characterToken });
    assert.match((await attacker.wait("error")).message, /no longer available/);
    attacker.send({
      type: "join",
      worldId: joined.world.id,
      playerName: "Stranger",
      password: "wrong",
    });
    assert.match((await attacker.wait("error")).message, /Incorrect world password/);
    returning.send(resume);
    const restored = await returning.wait("joined");
    assert.equal(restored.world.id, joined.world.id);
    assert.equal(restored.characterToken, joined.characterToken);
    assert.equal(restored.world.players[0].name, "Owner");
    assert.equal(restored.world.players[0].level, joined.world.players[0].level);
    assert.equal(restored.world.players[0].scene, undefined);
    attacker.send(resume);
    assert.match((await attacker.wait("error")).message, /no longer available/);
    returning.send({ type: "leave" });
    await returning.wait("left");
    returning.send(resume);
    assert.match((await returning.wait("error")).message, /no longer available/);
    returning.send({
      type: "join",
      worldId: permanentId,
      playerName: "Owner",
      password: "",
      characterToken: joined.characterToken,
    });
    await returning.wait("joined");
    returning.send({ type: "leave" });
    await returning.wait("left");
    returning.send({ ...resume, worldId: permanentId });
    assert.match((await returning.wait("error")).message, /no longer available/);
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("HTML revalidates, version checks bypass caches, and only hashed bundles are immutable", async () => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-cache-"));
  await mkdir(join(directory, "assets"));
  await writeFile(join(directory, "index.html"), "first");
  await writeFile(join(directory, "version.json"), '{"buildId":"first"}');
  await writeFile(join(directory, "assets/vendors-abc12345.js"), "dependencies");
  await writeFile(join(directory, "assets/image.png"), "image");
  const app = await start(directory);
  try {
    for (const [path, policy] of [
      ["/", "no-cache"],
      ["/index.html", "no-cache"],
      ["/version.json", "no-store"],
      ["/assets/vendors-abc12345.js", "public, max-age=31536000, immutable"],
      ["/assets/image.png", "no-cache"],
    ]) {
      assert.equal((await fetch(app.url + path)).headers.get("cache-control"), policy);
    }
    await writeFile(join(directory, "version.json"), '{"buildId":"second"}');
    assert.equal((await (await fetch(app.url + "/version.json")).json()).buildId, "second");
    const head = await fetch(app.url + "/", { method: "HEAD" });
    assert.equal(head.headers.get("cache-control"), "no-cache");
    assert.equal(await head.text(), "");
  } finally {
    await app.close();
    await rm(directory, { recursive: true, force: true });
  }
});
