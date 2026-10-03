import { validateDefinitions } from "@emberfall/common-new/definitions/index";
import { RUNTIME } from "@emberfall/common-new/definitions/runtime";
import { VILLAGE_DEFINITION } from "@emberfall/common-new/definitions/worlds/village";
import { stepMovement } from "./systems/movement.ts";
import { randomUUID, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { EventEmitter } from "node:events";
import { Peer as WebSocket } from "./network/peer.ts";
import { createPlayers } from "./ecs/simulation.ts";
import {
  MAX_PLAYERS,
  clientMessage,
  nearbyInteraction,
  requestPlayerCast,
  TICK_MS,
} from "@emberfall/common-new";
import type {
  ChatMessage,
  Player,
  ServerMessage,
  WorldState,
  SceneState,
} from "@emberfall/common-new";
import { CharacterStore } from "./characters.ts";
import { sceneAction, tickScene, reconcileVote, cleanupScene, sceneState } from "./scenes.ts";
import type { Scene } from "./scenes.ts";
import { addChat } from "./chat.ts";

const derive = promisify(scrypt);
interface World {
  chat?: ChatMessage[];
  id: string;
  name: string;
  hostId: string;
  salt: string;
  hash?: Buffer;
  players: Map<string, Player>;
  scene?: Scene;
  training?: SceneState;
}
interface Session {
  chatAt?: number;
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

export async function createRuntime(savePath = ":memory:") {
  validateDefinitions();
  const characters = new CharacterStore(savePath);
  await characters.ready;
  // ponytail: worlds live in one process; add room sharding when measured load requires it.
  const restoredWorlds = characters.worlds();
  const permanentWorld: World = {
    id: randomUUID(),
    name: "New Permanent World",
    hostId: "",
    salt: "",
    players: createPlayers(),
    ...restoredWorlds.find((world) => world.permanent),
  };
  characters.saveWorld(permanentWorld, true);
  const worlds = new Map<string, World>(
    restoredWorlds.map((world) => [
      world.id,
      {
        ...world,
        hostId: "",
        players: createPlayers(),
      },
    ]),
  );
  worlds.set(permanentWorld.id, permanentWorld);
  let shuttingDown = false;
  const sessions = new Map<WebSocket, Session>();
  let hashing = 0;
  const wss = new EventEmitter();
  const send = (ws: WebSocket, message: ServerMessage) => {
    if (ws.readyState !== WebSocket.OPEN) return;
    if (ws.bufferedAmount > 128_000) {
      ws.terminate();
      return;
    }
    ws.send(message);
  };
  const state = (world: World, now = Date.now()): WorldState => ({
    id: world.id,
    name: world.name,
    hostId: world.hostId,
    players: [...world.players.values()],
    chat: world.chat ?? [],
    scene: sceneState(world.scene),
    training: world.training,
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
      if (player) {
        if (!session.reconnectUntil)
          addChat(world, `${player.name} disconnected.`, undefined, player.id);
        if (player.scene)
          addChat(
            world,
            `${player.name} left the scene. Everyone became weaker.`,
            undefined,
            player.id,
          );
      }
      world.players.delete(session.id);
      reconcileVote(world, Date.now());
      cleanupScene(world);
      if (!world.players.size) {
        if (world !== permanentWorld && !shuttingDown) {
          characters.deleteWorld(world.id);
          worlds.delete(world.id);
        }
        world.hostId = "";
        world.scene = undefined;
        world.chat = [];
      } else if (world.hostId === session.id) world.hostId = world.players.keys().next().value!;
    }
    session.worldId = undefined;
    session.inputs = [];
    session.lastSeq = 0;
    session.timed = undefined;
    session.x = 0;
    session.y = 0;
  }
  wss.on("connection", (ws: WebSocket) => {
    if (sessions.size >= 256) {
      ws.close(1008, "Server is full");
      return;
    }
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
    ws.on("close", (code: number) => {
      if (shuttingDown) {
        sessions.delete(ws);
        return;
      }
      if (session.worldId && !shuttingDown && code !== 1000 && code !== 1005 && code !== 1008) {
        session.reconnectUntil = Date.now() + RUNTIME.reconnectMs;
        session.inputs = [];
        session.x = session.y = 0;
        session.inputAt = 0;
        const player = worlds.get(session.worldId)?.players.get(session.id);
        const world = worlds.get(session.worldId);
        if (world && player) addChat(world, `${player.name} disconnected.`, undefined, player.id);
        if (player?.attacking) player.attacking = false;
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
    ws.on("command", async (command: unknown) => {
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
        parsed = clientMessage.safeParse(command);
      } catch {
        error("Invalid message.");
        return;
      }
      if (!parsed.success) {
        error("Invalid message.");
        return;
      }
      const message = parsed.data;
      if (message.type === "ping") {
        send(ws, { type: "pong", id: message.id });
        return;
      }
      if (message.type === "combatInput") {
        const player = worlds.get(session.worldId ?? "")?.players.get(session.id);
        if (player) {
          const { type: _, ...controls } = message;
          Object.assign(player, controls, { combatInputAt: now });
        }
        return;
      }
      if (message.type === "cast") {
        const world = worlds.get(session.worldId ?? "");
        const player = world?.players.get(session.id);
        if (player)
          requestPlayerCast(
            player.scene === "forest" ? world!.scene : world!.training,
            player,
            message,
            now,
          );
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
      if (message.type === "chat") {
        const world = worlds.get(session.worldId ?? "");
        const player = world?.players.get(session.id);
        if (!world || !player) {
          error("Join a world first.");
          return;
        }
        if (now - (session.chatAt ?? 0) < 500) {
          error("Please wait a moment before sending another chat message.");
          return;
        }
        session.chatAt = now;
        player.chat = message.text;
        addChat(world, message.text, player);
        const update: ServerMessage = { type: "state", world: state(world, now) };
        for (const [peer, member] of sessions) if (member.worldId === world.id) send(peer, update);
        return;
      }
      if (message.type === "leave") {
        try {
          leave(session);
          if (session.characterId) characters.forgetWorld(session.characterId);
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
        message.type === "joinScene" ||
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
          if (
            !world ||
            !existingCharacter ||
            (active() && !retained) ||
            (!retained && !characters.canResume(existingCharacter.id, message.worldId))
          ) {
            error("Your previous session is no longer available. Join or create a world again.");
            return;
          }
          if (retained) {
            const [oldWs, old] = retained;
            session.id = old.id;
            session.worldId = old.worldId;
            session.characterId = old.characterId;
            session.chatAt = old.chatAt;
            const player = world.players.get(session.id)!;
            player.inputSeq = player.inputElapsed = undefined;
            player.inputX = player.inputY = 0;
            sessions.delete(oldWs);
            addChat(world, `${player.name} joined.`, undefined, player.id);
            send(ws, {
              type: "joined",
              playerId: session.id,
              world: state(world),
              characterToken: message.characterToken,
            });
            return;
          }
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
            players: createPlayers(),
          };
          worlds.set(world.id, world);
          createdWorld = world;
          characters.saveWorld(world);
        } else {
          const existing = worlds.get(message.worldId);
          if (!existing) {
            error("This world has closed.");
            return;
          }
          world = existing;
          if (world.hash && message.type !== "resume") {
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
          const created = characters.create(
            message.type === "resume" ? existingCharacter!.name : message.playerName,
          );
          character = created;
          token = created.token;
        }
        const playerName = message.type === "resume" ? existingCharacter!.name : message.playerName;
        characters.save(character.id, playerName, {
          ...character.progress,
          classId: character.classId,
          classes: character.classes,
        });
        session.characterId = character.id;
        characters.rememberWorld(character.id, world.id);
        session.worldId = world.id;
        const used = new Set([...world.players.values()].map((p) => p.color));
        let color = 0;
        while (used.has(color)) color++;
        world.players.set(session.id, {
          id: session.id,
          name: playerName,
          x: VILLAGE_DEFINITION.spawn.x + color * VILLAGE_DEFINITION.spawn.spacing,
          y: VILLAGE_DEFINITION.spawn.y,
          color,
          ...character.progress,
          classId: character.classId,
          classes: character.classes,
          hitpoints: character.progress.hitpoints || character.progress.maxHitpoints,
        });
        if (!world.hostId) world.hostId = session.id;
        addChat(world, `${playerName} joined.`, undefined, session.id);
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
        if (createdWorld && !createdWorld.players.size) {
          characters.deleteWorld(createdWorld.id);
          worlds.delete(createdWorld.id);
        }
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
        stepMovement(session, player, world?.scene?.id, now, wallTime);
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
  }, RUNTIME.autosaveMs);
  async function close() {
    shuttingDown = true;
    clearInterval(tick);
    clearInterval(heartbeat);
    clearInterval(progressTick);
    clearInterval(autosave);
    const failures: unknown[] = [];
    for (const session of sessions.values()) {
      try {
        leave(session);
      } catch (error) {
        failures.push(error);
      }
    }
    for (const ws of sessions.keys()) ws.terminate();
    characters.close();
    if (failures.length)
      throw new AggregateError(failures, "Some characters could not be saved during shutdown");
  }
  return { connect: (peer: WebSocket) => wss.emit("connection", peer), close, characters, worlds };
}
