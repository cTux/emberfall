import { createServer } from "node:http";
import type { RequestListener } from "node:http";
import { createServer as createSecureServer } from "node:https";
import type { ServerOptions } from "node:https";
import { randomUUID, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { WebSocketServer, WebSocket } from "ws";
import {
  MAX_PLAYERS,
  clientMessage,
  nearbyInteraction,
  movePlayer,
  TICK_MS,
} from "@emberfall/common";
import type { Player, ServerMessage, WorldState } from "@emberfall/common";
import { CharacterStore } from "./characters.ts";
import { sceneAction, tickScene, reconcileVote, cleanupScene, sceneState } from "./scenes.ts";
import type { Scene } from "./scenes.ts";

const derive = promisify(scrypt);
interface World {
  id: string;
  name: string;
  hostId: string;
  salt: string;
  hash?: Buffer;
  players: Map<string, Player>;
  scene?: Scene;
}
interface Session {
  id: string;
  worldId?: string;
  x: number;
  y: number;
  inputAt: number;
  epoch?: string;
  lastSeq: number;
  timed?: boolean;
  inputs: {
    seq: number;
    x: number;
    y: number;
    epoch?: string;
    durationMs?: number;
    elapsed?: number;
  }[];
  alive: boolean;
  busy: boolean;
  windowAt: number;
  messages: number;
  actions: number;
  actionAt: number;
  characterId?: string;
  reconnectUntil?: number;
}

export function createGameServer(staticRoot?: string, savePath = ":memory:", tls?: ServerOptions) {
  const characters = new CharacterStore(savePath);
  // ponytail: worlds live in one process; add room sharding when measured load requires it.
  const worlds = new Map<string, World>();
  const sessions = new Map<WebSocket, Session>();
  let hashing = 0;
  const handler: RequestListener = async (req, res) => {
    if (req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end('{"ok":true}');
      return;
    }
    if (!staticRoot || !["GET", "HEAD"].includes(req.method ?? "")) {
      res.writeHead(404);
      res.end();
      return;
    }
    try {
      const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://localhost").pathname);
      const root = resolve(staticRoot);
      const file = resolve(root, "." + (pathname === "/" ? "/index.html" : pathname));
      if (!file.startsWith(root + sep)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const content = await readFile(file);
      const mime: Record<string, string> = {
        ".html": "text/html",
        ".js": "text/javascript",
        ".css": "text/css",
        ".png": "image/png",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".ttf": "font/ttf",
        ".txt": "text/plain",
      };
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      res.writeHead(404);
      res.end();
    }
  };
  const server = tls ? createSecureServer(tls, handler) : createServer(handler);
  const wss = new WebSocketServer({ noServer: true, maxPayload: 2048 });
  server.on("upgrade", (req, socket, head) => {
    let originAllowed = true;
    try {
      if (req.headers.origin) originAllowed = new URL(req.headers.origin).host === req.headers.host;
    } catch {
      originAllowed = false;
    }
    if (req.url !== "/ws" || !originAllowed || sessions.size >= 256) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit("connection", ws, req));
  });
  const send = (ws: WebSocket, message: ServerMessage) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 128_000) {
      ws.terminate();
      return;
    }
    ws.send(JSON.stringify(message));
  };
  const state = (world: World, now = Date.now()): WorldState => ({
    id: world.id,
    name: world.name,
    hostId: world.hostId,
    players: [...world.players.values()],
    scene: sceneState(world.scene),
    serverNow: now,
  });
  const list = () => ({
    type: "worlds" as const,
    worlds: [...worlds.values()].map((w) => ({
      id: w.id,
      name: w.name,
      locked: !!w.hash,
      players: w.players.size,
      capacity: MAX_PLAYERS,
    })),
  });
  const broadcastList = () => {
    const message = list();
    for (const ws of sessions.keys()) send(ws, message);
  };
  function leave(session: Session) {
    const world = worlds.get(session.worldId ?? "");
    if (world) {
      const player = world.players.get(session.id);
      if (player && session.characterId) characters.save(session.characterId, player.name, player);
      world.players.delete(session.id);
      reconcileVote(world, Date.now());
      cleanupScene(world);
      if (!world.players.size) worlds.delete(world.id);
      else if (world.hostId === session.id) world.hostId = world.players.keys().next().value!;
    }
    session.worldId = undefined;
    session.inputs = [];
    session.lastSeq = 0;
    session.timed = undefined;
    session.x = 0;
    session.y = 0;
  }
  wss.on("connection", (ws) => {
    const session: Session = {
      id: randomUUID(),
      x: 0,
      y: 0,
      inputAt: 0,
      lastSeq: 0,
      inputs: [],
      alive: true,
      busy: false,
      windowAt: Date.now(),
      messages: 0,
      actions: 0,
      actionAt: Date.now(),
    };
    sessions.set(ws, session);
    send(ws, list());
    ws.on("error", () => ws.terminate());
    ws.on("pong", () => {
      session.alive = true;
    });
    ws.on("close", (code) => {
      if (session.worldId && code !== 1000 && code !== 1001 && code !== 1005 && code !== 1008) {
        session.reconnectUntil = Date.now() + 30_000;
        session.inputs = [];
        session.x = session.y = 0;
        session.inputAt = 0;
        const player = worlds.get(session.worldId)?.players.get(session.id);
        try {
          if (player && session.characterId)
            characters.save(session.characterId, player.name, player);
        } catch (error) {
          console.error("Character save failed on disconnect; autosave will retry:", error);
        }
        return;
      }
      try {
        leave(session);
      } catch (error) {
        console.error("Character save failed on disconnect:", error);
        // Keep the session in memory for the autosave retry; it cannot move.
        session.x = 0;
        session.y = 0;
        return;
      }
      sessions.delete(ws);
      broadcastList();
    });
    ws.on("message", async (raw, binary) => {
      const error = (message: string) => send(ws, { type: "error", message });
      const now = Date.now();
      if (now - session.windowAt > 1000) {
        session.windowAt = now;
        session.messages = 0;
      }
      if (++session.messages > 80) {
        ws.close(1008, "Too many messages");
        return;
      }
      let parsed;
      try {
        parsed = clientMessage.safeParse(JSON.parse(raw.toString()));
      } catch {
        error("Invalid message.");
        return;
      }
      if (binary || !parsed.success) {
        error("Invalid message.");
        return;
      }
      const message = parsed.data;
      if (message.type === "ping") {
        send(ws, { type: "pong", id: message.id });
        return;
      }
      if (message.type === "move") {
        if (session.worldId) {
          if (message.seq !== undefined) {
            if (message.seq <= session.lastSeq) return;
            const timed = message.durationMs !== undefined;
            if (session.timed !== undefined && session.timed !== timed) return;
            if (timed && session.inputs.length >= 40) return;
            session.timed = timed;
            session.lastSeq = message.seq;
            // Inputs are held directions, not movement impulses. Coalesce delayed heartbeats.
            const command = {
              seq: message.seq,
              x: message.x,
              y: message.y,
              epoch: message.epoch,
              durationMs: message.durationMs,
            };
            if (timed) session.inputs.push(command);
            else session.inputs = [command];
          } else if (session.lastSeq === 0) {
            session.x = message.x;
            session.y = message.y;
          }
          session.inputAt = now;
        }
        return;
      }
      if (session.busy) {
        error("Please wait for your previous request.");
        return;
      }
      if (message.type === "leave") {
        try {
          leave(session);
        } catch {
          error("Save failed. Your character is still in this world; please retry.");
          return;
        }
        send(ws, { type: "saved", savedAt: Date.now() });
        send(ws, { type: "left" });
        broadcastList();
        return;
      }
      if (message.type === "selectClass") {
        const world = worlds.get(session.worldId ?? "");
        const player = world?.players.get(session.id);
        if (
          !player ||
          !session.characterId ||
          player.scene ||
          world?.scene?.phase === "countdown" ||
          nearbyInteraction(player)?.id !== "wardrobe"
        ) {
          error("Use the village wardrobe before the departure countdown to change class.");
          return;
        }
        try {
          characters.selectClass(session.characterId, player, message.classId);
          send(ws, { type: "state", world: state(world!) });
        } catch {
          error("Unable to save class change. Your current class has been kept.");
        }
        return;
      }
      if (
        message.type === "createScene" ||
        message.type === "ready" ||
        message.type === "returnLobby" ||
        message.type === "leaveScene"
      ) {
        const world = worlds.get(session.worldId ?? "");
        const player = world?.players.get(session.id);
        if (!world || !player) {
          error("Join a world first.");
          return;
        }
        try {
          sceneAction(world, player, message, now);
          session.x = 0;
          session.y = 0;
        } catch (cause) {
          error((cause as Error).message);
        }
        return;
      }
      if (session.worldId) {
        error("Leave your current world first.");
        return;
      }
      if (now - session.actionAt > 10_000) {
        session.actionAt = now;
        session.actions = 0;
      }
      if (++session.actions > 5 || hashing >= 8) {
        error("Too many attempts. Try again in a moment.");
        return;
      }
      session.busy = true;
      let createdWorld: World | undefined;
      try {
        const existingCharacter = message.characterToken
          ? characters.load(message.characterToken)
          : undefined;
        const active = () =>
          existingCharacter &&
          [...sessions.values()].some((s) => s.worldId && s.characterId === existingCharacter.id);
        if (message.type !== "resume" && active()) {
          error("This character is already playing in another tab. Leave that world first.");
          return;
        }
        if (message.type === "resume") {
          const retained = [...sessions.entries()].find(
            ([oldWs, old]) =>
              oldWs.readyState === WebSocket.CLOSED &&
              old.characterId === existingCharacter?.id &&
              old.worldId === message.worldId &&
              (old.reconnectUntil ?? 0) > now,
          );
          const world = worlds.get(message.worldId);
          if (!retained || !world) {
            error("Your previous session is no longer available. Join or create a world again.");
            return;
          }
          const [oldWs, old] = retained;
          session.id = old.id;
          session.worldId = old.worldId;
          session.characterId = old.characterId;
          const player = world.players.get(session.id)!;
          player.inputSeq = player.inputElapsed = undefined;
          player.inputX = player.inputY = 0;
          sessions.delete(oldWs);
          send(ws, {
            type: "joined",
            playerId: session.id,
            world: state(world),
            characterToken: message.characterToken,
          });
          return;
        }
        let world: World;
        if (message.type === "create") {
          if (worlds.size >= 64) {
            error("The server is full. Try again later.");
            return;
          }
          const salt = randomBytes(16).toString("hex");
          let hash: Buffer | undefined;
          if (message.password) {
            hashing++;
            try {
              hash = (await derive(message.password, salt, 32)) as Buffer;
            } finally {
              hashing--;
            }
          }
          if (ws.readyState !== WebSocket.OPEN) return;
          if (worlds.size >= 64) {
            error("The server is full.");
            return;
          }
          world = {
            id: randomUUID(),
            name: message.name,
            hostId: session.id,
            salt,
            hash,
            players: new Map(),
          };
          worlds.set(world.id, world);
          createdWorld = world;
        } else {
          const existing = worlds.get(message.worldId);
          if (!existing) {
            error("This world has closed.");
            return;
          }
          world = existing;
          if (world.hash) {
            hashing++;
            let hash: Buffer;
            try {
              hash = (await derive(message.password, world.salt, 32)) as Buffer;
            } finally {
              hashing--;
            }
            if (!timingSafeEqual(hash, world.hash)) {
              error("Incorrect world password.");
              return;
            }
          }
          if (ws.readyState !== WebSocket.OPEN) return;
          if (!worlds.has(world.id)) {
            error("This world has closed.");
            return;
          }
          if (world.players.size >= MAX_PLAYERS) {
            error("This world is full.");
            return;
          }
        }
        if (active()) {
          error("This character is already playing in another tab.");
          return;
        }
        // Password hashing yields; refresh after it so a recent save cannot be overwritten.
        let character = message.characterToken
          ? characters.load(message.characterToken)
          : undefined;
        let token = message.characterToken;
        if (!character) {
          const created = characters.create(message.playerName);
          character = created;
          token = created.token;
        }
        characters.save(character.id, message.playerName, {
          ...character.progress,
          classId: character.classId,
          classes: character.classes,
        });
        session.characterId = character.id;
        session.worldId = world.id;
        const used = new Set([...world.players.values()].map((p) => p.color));
        let color = 0;
        while (used.has(color)) color++;
        world.players.set(session.id, {
          id: session.id,
          name: message.playerName,
          x: 420 + color * 22,
          y: 340,
          color,
          ...character.progress,
          classId: character.classId,
          classes: character.classes,
          hitpoints: character.progress.hitpoints || character.progress.maxHitpoints,
        });
        reconcileVote(world, Date.now());
        send(ws, {
          type: "joined",
          playerId: session.id,
          world: state(world),
          characterToken: token!,
        });
        send(ws, { type: "saved", savedAt: Date.now() });
        broadcastList();
      } catch (cause) {
        console.error("Unable to load character:", cause);
        error(
          "Unable to load or save your character. Check the server and retry; existing progress has not been reset.",
        );
      } finally {
        if (createdWorld && !createdWorld.players.size) worlds.delete(createdWorld.id);
        session.busy = false;
      }
    });
  });
  let simulationAt = Date.now();
  const tick = setInterval(() => {
    const wallTime = Date.now();
    if (wallTime - simulationAt > 250) simulationAt = wallTime - 250;
    while (wallTime - simulationAt >= TICK_MS) {
      simulationAt += TICK_MS;
      const now = simulationAt;
      for (const session of sessions.values()) {
        const world = worlds.get(session.worldId ?? "");
        const player = world?.players.get(session.id);
        if (!player) continue;
        if (session.timed) {
          let budget = TICK_MS;
          player.inputX = player.inputY = 0;
          while (budget > 0.0001 && session.inputs.length) {
            const command = session.inputs[0];
            const epoch = player.scene === "forest" ? world!.scene?.id : "lobby";
            const elapsed = command.elapsed ?? 0;
            const dt = Math.min(budget, command.durationMs! - elapsed);
            if (command.epoch === epoch && now - session.inputAt <= 1000) {
              movePlayer(player, command.x, command.y, dt / 1000);
              player.inputX = command.x;
              player.inputY = command.y;
            }
            command.elapsed = elapsed + dt;
            player.inputSeq = command.seq;
            player.inputElapsed = command.elapsed;
            budget -= dt;
            if (command.elapsed >= command.durationMs! - 0.0001) session.inputs.shift();
          }
          continue;
        }
        const command = session.inputs.shift();
        if (command) player.inputSeq = command.seq;
        const epoch = player.scene === "forest" ? world!.scene?.id : "lobby";
        if (command) {
          session.epoch = command.epoch;
          session.x = command.x;
          session.y = command.y;
        }
        const fresh =
          now - session.inputAt <= 250 && (session.lastSeq === 0 || session.epoch === epoch);
        const x = fresh ? session.x : 0;
        const y = fresh ? session.y : 0;
        player.inputX = x;
        player.inputY = y;
        player.inputAt = now;
        movePlayer(player, x, y, TICK_MS / 1000);
      }
      for (const world of worlds.values()) {
        tickScene(world, now, TICK_MS / 1000);
        const message: ServerMessage = { type: "state", world: state(world, now) };
        for (const [ws, session] of sessions) if (session.worldId === world.id) send(ws, message);
      }
    }
  }, 10);
  const heartbeat = setInterval(() => {
    for (const [ws, session] of sessions) {
      if (ws.readyState !== WebSocket.OPEN) continue;
      if (!session.alive) {
        ws.terminate();
        continue;
      }
      session.alive = false;
      ws.ping();
    }
  }, 15_000);
  const progressTick = setInterval(() => {
    for (const [ws, session] of sessions) {
      const player = worlds.get(session.worldId ?? "")?.players.get(session.id);
      if (player && ws.readyState === WebSocket.OPEN) player.playtimeSeconds++;
    }
  }, 1000);
  const autosave = setInterval(() => {
    for (const [ws, session] of sessions) {
      const player = worlds.get(session.worldId ?? "")?.players.get(session.id);
      if (!player || !session.characterId) continue;
      try {
        characters.save(session.characterId, player.name, player);
        send(ws, { type: "saved", savedAt: Date.now() });
        if (ws.readyState === WebSocket.CLOSED && (session.reconnectUntil ?? 0) <= Date.now()) {
          leave(session);
          sessions.delete(ws);
          broadcastList();
        }
      } catch {
        send(ws, {
          type: "error",
          message: "Character autosave failed. Retrying; keep this session open.",
        });
      }
    }
  }, 5000);
  async function close() {
    clearInterval(tick);
    clearInterval(heartbeat);
    clearInterval(progressTick);
    clearInterval(autosave);
    for (const session of sessions.values()) leave(session);
    for (const ws of sessions.keys()) ws.terminate();
    await new Promise<void>((r) => wss.close(() => r()));
    await new Promise<void>((r) => server.close(() => r()));
    characters.close();
  }
  return { server, close };
}
