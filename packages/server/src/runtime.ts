import { gatherResource, restoreResources } from '@emberfall/core';
import type { ResourceState } from '@emberfall/common';
import {
  learnTalent,
  resetTalents,
  BULLSEYE,
  forestDistance,
  INTERACTION_RADIUS,
  castTalentAbility,
} from '@emberfall/core';
import { validateDefinitions } from '@emberfall/core/definitions/index';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import { stepMovement } from './systems/movement.ts';
import { randomUUID, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { EventEmitter } from 'node:events';
import { Peer as WebSocket } from './network/peer.ts';
import { createPlayers } from './ecs/simulation.ts';
import {
  MAX_PLAYERS,
  clientMessage,
  nearbyInteraction,
  syncEquipmentVitals,
  useBackpackItem,
  unequipItem,
  tradeItem,
  sellAll,
  transferStoredItem,
  moveStorageItem,
} from '@emberfall/core';
import { requestPlayerCast, TICK_MS } from '@emberfall/core';
import type {
  ChatMessage,
  Player,
  ServerMessage,
  WorldState,
  SceneState,
  Merchant,
} from '@emberfall/common';
import { CharacterStore } from './characters.ts';
import { sceneAction, tickScene, reconcileVote, cleanupScene, sceneState } from './scenes.ts';
import type { Scene } from './scenes.ts';
import { addChat } from './chat.ts';
import { VillageLife } from './npcs.ts';
import { OllamaNpcDialogue, type NpcDialogue } from './npc-models.ts';
import type { VillageNpc } from '@emberfall/common';
import { serverLog } from './log.ts';

const derive = promisify(scrypt);
type AccountIdentity = () => { characterId: string; nickname: string | null } | undefined;
interface World {
  resources?: Record<string, ResourceState>;
  npcs?: VillageNpc[];
  merchant?: Merchant;
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
  reconnectTimer?: ReturnType<typeof setTimeout>;
}

export async function createRuntime(
  savePath = ':memory:',
  dialogue: NpcDialogue = new OllamaNpcDialogue(),
) {
  validateDefinitions();
  const characters = new CharacterStore(savePath);
  await characters.ready;
  // ponytail: worlds live in one process; add room sharding when measured load requires it.
  const restoredWorlds = characters.worlds();
  const permanentWorld: World = {
    id: randomUUID(),
    hostId: '',
    salt: '',
    players: createPlayers(),
    ...restoredWorlds.find((world) => world.permanent),
    name: 'Playtest Default',
  };
  characters.saveWorld(permanentWorld, true);
  const worlds = new Map<string, World>(
    restoredWorlds.map((world) => [
      world.id,
      {
        ...world,
        hostId: '',
        players: createPlayers(),
      },
    ]),
  );
  worlds.set(permanentWorld.id, permanentWorld);
  serverLog.info('Runtime ready', { worlds: worlds.size, restoredWorlds: restoredWorlds.length });
  let shuttingDown = false;
  const sessions = new Map<WebSocket, Session>();
  const villageLives = new Map<World, VillageLife>();
  const villageLife = (world: World, now: number) => {
    let life = villageLives.get(world);
    if (!life) {
      life = new VillageLife(world, dialogue, now);
      villageLives.set(world, life);
    }
    return life;
  };
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
  const state = (world: World, now = Date.now(), viewer?: Player): WorldState => ({
    id: world.id,
    name: world.name,
    hostId: world.hostId,
    players: [...world.players.values()],
    chat: (world.chat ?? [])
      .filter((m) => !m.dimension || m.dimension === (viewer?.scene ?? 'village'))
      .slice(-10),
    npcs: world.npcs,
    resources: world.resources,
    scene: sceneState(world.scene),
    training: world.training,
    serverNow: now,
    merchant: (world.merchant ??= characters.merchant(world.id)),
  });
  const list = () => ({
    type: 'worlds' as const,
    worlds: [...worlds.values()].map((w) => ({
      id: w.id,
      name: w.name,
      locked: !!w.hash,
      players: w.players.size,
      capacity: w === permanentWorld ? 32 : MAX_PLAYERS,
    })),
  });
  const broadcastList = () => {
    const message = list();
    for (const ws of sessions.keys()) send(ws, message);
  };
  function leave(session: Session) {
    const world = worlds.get(session.worldId ?? '');
    if (world) {
      const player = world.players.get(session.id);
      if (player && session.characterId) characters.save(session.characterId, player.name, player);
      if (player) {
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
      if (player) serverLog.info('Player left world', { sessionId: session.id, worldId: world.id });
      reconcileVote(world, Date.now());
      cleanupScene(world);
      if (!world.players.size) {
        if (world !== permanentWorld && !shuttingDown) {
          characters.deleteWorld(world.id);
          worlds.delete(world.id);
          serverLog.info('Empty world removed', { worldId: world.id });
        }
        world.hostId = '';
        world.scene = undefined;
        world.chat = [];
        villageLives.get(world)?.close();
        villageLives.delete(world);
        world.npcs = undefined;
      } else if (world.hostId === session.id) world.hostId = world.players.keys().next().value!;
    }
    clearTimeout(session.reconnectTimer);
    session.worldId = undefined;
    session.inputs = [];
    session.lastSeq = 0;
    session.timed = undefined;
    session.x = 0;
    session.y = 0;
  }
  wss.on('connection', (ws: WebSocket, account?: AccountIdentity) => {
    if (sessions.size >= 256) {
      ws.close(1008, 'Server is full');
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
    serverLog.info('Client connected', { sessionId: session.id });
    send(ws, list());
    ws.on('error', () => ws.terminate());
    ws.on('pong', () => {
      session.alive = true;
    });
    ws.on('close', (code: number) => {
      serverLog.info('Client disconnected', { sessionId: session.id, code });
      if (shuttingDown) {
        sessions.delete(ws);
        return;
      }
      if (session.worldId && !shuttingDown && code !== 1008) {
        session.reconnectUntil = Date.now() + RUNTIME.reconnectMs;
        serverLog.info('Waiting for player reconnect', {
          sessionId: session.id,
          worldId: session.worldId,
          graceMs: RUNTIME.reconnectMs,
        });
        session.inputs = [];
        session.x = session.y = 0;
        session.inputAt = 0;
        const player = worlds.get(session.worldId)?.players.get(session.id);
        if (player) {
          player.reconnecting = true;
          player.inputX = player.inputY = 0;
        }
        session.reconnectTimer = setTimeout(() => {
          try {
            leave(session);
            sessions.delete(ws);
            broadcastList();
          } catch (error) {
            serverLog.error(
              'Character save failed on reconnect expiry; autosave will retry:',
              error,
            );
          }
        }, RUNTIME.reconnectMs);
        if (player?.attacking) player.attacking = false;
        try {
          if (player && session.characterId)
            characters.save(session.characterId, player.name, player);
        } catch (error) {
          serverLog.error('Character save failed on disconnect; autosave will retry:', error);
        }
        return;
      }
      try {
        leave(session);
      } catch (error) {
        serverLog.error('Character save failed on disconnect:', error);
        // Keep the session in memory for the autosave retry; it cannot move.
        session.x = 0;
        session.y = 0;
        return;
      }
      sessions.delete(ws);
      broadcastList();
    });
    // Password hashing and persistence failures are caught and sent to the peer below.
    // oxlint-disable-next-line typescript/no-misused-promises
    ws.on('command', async (command: unknown) => {
      const error = (message: string) => send(ws, { type: 'error', message });
      const authenticated = account?.();
      if (account && !authenticated?.nickname) {
        ws.close(1008, 'Please sign in again');
        return;
      }
      if (
        authenticated &&
        command &&
        typeof command === 'object' &&
        'type' in command &&
        ['join', 'create', 'resume'].includes(String(command.type))
      ) {
        // Wire credentials cannot select or rename a Steam-owned character.
        command = {
          ...command,
          playerName: authenticated.nickname,
          characterToken: '0'.repeat(64),
        };
      }
      const now = Date.now();
      if (now - session.windowAt > 1000) {
        session.windowAt = now;
        session.messages = 0;
      }
      if (++session.messages > 80) {
        ws.close(1008, 'Too many messages');
        return;
      }
      let parsed;
      try {
        parsed = clientMessage.safeParse(command);
      } catch {
        error('Invalid message.');
        return;
      }
      if (!parsed.success) {
        error('Invalid message.');
        return;
      }
      const message = parsed.data;
      if (message.type === 'gather') {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (!world || !player) return;
        const epoch = player.scene === 'forest' ? world.scene?.id : 'lobby';
        if (message.epoch !== epoch) return;
        try {
          gatherResource(player, (world.resources ??= {}), message.nodeId, now);
          broadcastState(world, now);
        } catch (cause) {
          error(cause instanceof Error ? cause.message : 'Unable to gather.');
        }
        return;
      }
      if (message.type === 'npcInteraction') {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (world && player) villageLife(world, now).interact(player, message.npcId);
        return;
      }
      if (message.type === 'ping') {
        send(ws, { type: 'pong', id: message.id });
        return;
      }
      if (message.type === 'combatInput') {
        const player = worlds.get(session.worldId ?? '')?.players.get(session.id);
        if (player) {
          const { type: _, ...controls } = message;
          Object.assign(player, controls, { combatInputAt: now });
        }
        return;
      }
      if (message.type === 'talentCast') {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (player)
          castTalentAbility(
            player.scene === 'forest' ? world!.scene : world!.training,
            player,
            message,
            now,
          );
        return;
      }
      if (message.type === 'cast') {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (player)
          requestPlayerCast(
            player.scene === 'forest' ? world!.scene : world!.training,
            player,
            message,
            now,
          );
        return;
      }
      if (message.type === 'move') {
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
        error('Please wait for your previous request.');
        return;
      }
      if (
        message.type === 'learnTalent' ||
        message.type === 'resetTalents' ||
        message.type === 'useItem' ||
        message.type === 'unequip' ||
        message.type === 'trade' ||
        message.type === 'sellAll' ||
        message.type === 'storeItem' ||
        message.type === 'renameStorage' ||
        message.type === 'moveStorageItem'
      ) {
        const trading = message.type === 'trade' || message.type === 'sellAll';
        const storing =
          message.type === 'storeItem' ||
          message.type === 'renameStorage' ||
          message.type === 'moveStorageItem';
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (!world || !player || !session.characterId || player.hitpoints <= 0) {
          error('Join a world with a living character first.');
          return;
        }
        villageLife(world, now);
        if (
          trading &&
          (player.scene ||
            nearbyInteraction(player, false, undefined, world.npcs)?.id !== 'innkeeper')
        ) {
          error('Trade near Marta the Innkeeper in the village.');
          return;
        }
        if (storing && (player.scene || nearbyInteraction(player)?.id !== 'storehouse')) {
          error('Use the Storehouse in the village.');
          return;
        }
        if (
          message.type === 'resetTalents' &&
          (player.scene ||
            !BULLSEYE ||
            player.classId !== message.classId ||
            forestDistance({ x: player.x, y: player.y + 15 }, BULLSEYE) >= INTERACTION_RADIUS)
        ) {
          error('Use the bullseye in the village to reset your current class talents.');
          return;
        }
        let saving = false;
        try {
          const next = structuredClone(player);
          const merchant = structuredClone((world.merchant ??= characters.merchant(world.id)));
          if (message.type === 'learnTalent') learnTalent(next, message.nodeId);
          else if (message.type === 'resetTalents') resetTalents(next);
          else if (message.type === 'trade') tradeItem(next, merchant, message.id, message.buying);
          else if (message.type === 'storeItem')
            transferStoredItem(next, message.tab, message.id, message.depositing);
          else if (message.type === 'moveStorageItem')
            moveStorageItem(next, message.fromTab, message.toTab, message.id);
          else if (message.type === 'renameStorage')
            next.storages![message.tab].name = message.name;
          else if (message.type === 'sellAll') sellAll(next, merchant);
          else if (message.type === 'unequip') unequipItem(next, message.slot);
          else useBackpackItem(next, message.id);
          saving = true;
          characters.save(
            session.characterId,
            next.name,
            next,
            trading ? { worldId: world.id, state: merchant } : undefined,
          );
          Object.assign(player, {
            talents: next.talents,
            backpack: next.backpack,
            storages: next.storages,
            equipment: next.equipment,
            coins: next.coins,
            hitpoints: next.hitpoints,
            maxHitpoints: next.maxHitpoints,
          });
          if (trading) world.merchant = merchant;
          send(ws, { type: 'state', world: state(world, now, player) });
        } catch (failure) {
          error(
            !saving && failure instanceof Error
              ? failure.message
              : 'Unable to save item action. Please retry.',
          );
        }
        return;
      }
      if (message.type === 'chat') {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (!world || !player) {
          error('Join a world first.');
          return;
        }
        if (now - (session.chatAt ?? 0) < 500) {
          error('Please wait a moment before sending another chat message.');
          return;
        }
        session.chatAt = now;
        player.chat = message.text;
        addChat(world, message.text, player);
        villageLife(world, now).hear(player, message.text, now);
        broadcastState(world, now);
        return;
      }
      if (message.type === 'leave') {
        try {
          leave(session);
          if (session.characterId) characters.forgetWorld(session.characterId);
        } catch {
          error('Save failed. Your character is still in this world; please retry.');
          return;
        }
        send(ws, { type: 'saved', savedAt: Date.now() });
        send(ws, { type: 'left' });
        broadcastList();
        return;
      }
      if (message.type === 'selectClass') {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (
          !player ||
          !session.characterId ||
          player.scene ||
          world?.scene?.phase === 'countdown' ||
          nearbyInteraction(player)?.id !== 'wardrobe'
        ) {
          error('Use the village wardrobe before the departure countdown to change class.');
          return;
        }
        try {
          characters.selectClass(session.characterId, player, message.classId);
          send(ws, { type: 'state', world: state(world!, now, player) });
        } catch {
          error('Unable to save class change. Your current class has been kept.');
        }
        return;
      }
      if (
        message.type === 'createScene' ||
        message.type === 'joinScene' ||
        message.type === 'ready' ||
        message.type === 'returnLobby' ||
        message.type === 'leaveScene'
      ) {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (!world || !player) {
          error('Join a world first.');
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
        error('Leave your current world first.');
        return;
      }
      if (now - session.actionAt > 10_000) {
        session.actionAt = now;
        session.actions = 0;
      }
      if (++session.actions > 5 || hashing >= 8) {
        error('Too many attempts. Try again in a moment.');
        return;
      }
      session.busy = true;
      let createdWorld: World | undefined;
      try {
        const existingCharacter = authenticated
          ? characters.loadById(authenticated.characterId)
          : message.characterToken
            ? characters.load(message.characterToken)
            : undefined;
        const active = () =>
          existingCharacter &&
          [...sessions.values()].some((s) => s.worldId && s.characterId === existingCharacter.id);
        if (message.type !== 'resume' && active()) {
          error('This character is already playing in another tab. Leave that world first.');
          return;
        }
        if (message.type === 'resume') {
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
            error('Your previous session is no longer available. Join or create a world again.');
            return;
          }
          if (retained) {
            const [oldWs, old] = retained;
            session.id = old.id;
            session.worldId = old.worldId;
            session.characterId = old.characterId;
            session.chatAt = old.chatAt;
            const player = world.players.get(session.id)!;
            delete player.reconnecting;
            clearTimeout(old.reconnectTimer);
            player.inputSeq = player.inputElapsed = undefined;
            player.inputX = player.inputY = 0;
            sessions.delete(oldWs);
            serverLog.info('Player reconnected', { sessionId: session.id, worldId: world.id });
            send(ws, {
              type: 'joined',
              playerId: session.id,
              world: state(world, now, world.players.get(session.id)),
              characterToken: authenticated ? '' : message.characterToken,
            });
            return;
          }
        }
        let world: World;
        if (message.type === 'create') {
          if (worlds.size >= 64) {
            error('The server is full. Try again later.');
            return;
          }
          const salt = randomBytes(16).toString('hex');
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
            error('The server is full.');
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
            error('This world has closed.');
            return;
          }
          world = existing;
          if (world.hash && message.type !== 'resume') {
            hashing++;
            let hash: Buffer;
            try {
              hash = (await derive(message.password, world.salt, 32)) as Buffer;
            } finally {
              hashing--;
            }
            if (!timingSafeEqual(hash, world.hash)) {
              error('Incorrect world password.');
              return;
            }
          }
          if (ws.readyState !== WebSocket.OPEN) return;
          if (!worlds.has(world.id)) {
            error('This world has closed.');
            return;
          }
          if (world.players.size >= (world === permanentWorld ? 32 : MAX_PLAYERS)) {
            error('This world is full.');
            return;
          }
        }
        if (active()) {
          error('This character is already playing in another tab.');
          return;
        }
        // Password hashing yields; refresh after it so a recent save cannot be overwritten.
        if (ws.readyState !== WebSocket.OPEN || (account && !account()?.nickname)) return;
        let character = authenticated
          ? characters.loadById(authenticated.characterId)
          : message.characterToken
            ? characters.load(message.characterToken)
            : undefined;
        let token = authenticated ? '' : message.characterToken;
        if (!character) {
          const created = characters.create(
            message.type === 'resume' ? existingCharacter!.name : message.playerName,
          );
          character = created;
          token = created.token;
        }
        const playerName = authenticated
          ? account!()!.nickname!
          : message.type === 'resume'
            ? existingCharacter!.name
            : message.playerName;
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
        villageLife(world, now);
        if (createdWorld) serverLog.info('World created', { worldId: world.id });
        serverLog.info(message.type === 'resume' ? 'Player resumed world' : 'Player joined world', {
          sessionId: session.id,
          worldId: world.id,
          players: world.players.size,
        });
        if (!world.hostId) world.hostId = session.id;
        addChat(world, `${playerName} joined.`, undefined, session.id);
        reconcileVote(world, Date.now());
        send(ws, {
          type: 'joined',
          playerId: session.id,
          world: state(world, now, world.players.get(session.id)),
          characterToken: token!,
        });
        send(ws, { type: 'saved', savedAt: Date.now() });
        broadcastList();
      } catch (cause) {
        serverLog.error('Unable to load character:', cause);
        error(
          'Unable to load or save your character. Check the server and retry; existing progress has not been reset.',
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
  function broadcastState(world: World, now: number) {
    const messages = new Map<string, ServerMessage>();
    for (const [ws, session] of sessions) {
      if (session.worldId !== world.id) continue;
      const player = world.players.get(session.id);
      const dimension = player?.scene ?? 'village';
      let message = messages.get(dimension);
      if (!message) {
        message = { type: 'state', world: state(world, now, player) };
        messages.set(dimension, message);
      }
      send(ws, message);
    }
  }
  let simulationAt = Date.now();
  const tick = setInterval(() => {
    const wallTime = Date.now();
    if (wallTime - simulationAt > 250) simulationAt = wallTime - 250;
    while (wallTime - simulationAt >= TICK_MS) {
      simulationAt += TICK_MS;
      const now = simulationAt;
      for (const session of sessions.values()) {
        const world = worlds.get(session.worldId ?? '');
        const player = world?.players.get(session.id);
        if (!player) continue;
        stepMovement(session, player, world?.scene?.id, now, wallTime);
      }
      for (const world of worlds.values()) {
        restoreResources(world.resources, wallTime);
        for (const player of world.players.values()) syncEquipmentVitals(player);
        tickScene(world, now, TICK_MS / 1000);
        if (world.players.size) villageLife(world, now).tick(now, TICK_MS / 1000);
        broadcastState(world, now);
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
      const player = worlds.get(session.worldId ?? '')?.players.get(session.id);
      if (player && ws.readyState === WebSocket.OPEN) player.playtimeSeconds++;
    }
  }, 1000);
  const autosave = setInterval(() => {
    for (const [ws, session] of sessions) {
      const player = worlds.get(session.worldId ?? '')?.players.get(session.id);
      if (!player || !session.characterId) continue;
      try {
        characters.save(session.characterId, player.name, player);
        send(ws, { type: 'saved', savedAt: Date.now() });
        if (ws.readyState === WebSocket.CLOSED && (session.reconnectUntil ?? 0) <= Date.now()) {
          leave(session);
          sessions.delete(ws);
          broadcastList();
        }
      } catch (error) {
        serverLog.error('Character autosave failed; retrying:', error);
        send(ws, {
          type: 'error',
          message: 'Character autosave failed. Retrying; keep this session open.',
        });
      }
    }
  }, RUNTIME.autosaveMs);
  async function close() {
    serverLog.info('Runtime stopping', { sessions: sessions.size, worlds: worlds.size });
    shuttingDown = true;
    clearInterval(tick);
    clearInterval(heartbeat);
    clearInterval(progressTick);
    clearInterval(autosave);
    for (const life of villageLives.values()) life.close();
    villageLives.clear();
    const failures: unknown[] = [];
    for (const session of sessions.values()) {
      clearTimeout(session.reconnectTimer);
      try {
        leave(session);
      } catch (error) {
        failures.push(error);
      }
    }
    for (const ws of sessions.keys()) ws.terminate();
    characters.close();
    if (failures.length)
      throw new AggregateError(failures, 'Some characters could not be saved during shutdown');
    serverLog.info('Runtime stopped');
  }
  function renameCharacter(characterId: string, nickname: string) {
    for (const session of sessions.values()) {
      if (session.characterId !== characterId) continue;
      const player = worlds.get(session.worldId ?? '')?.players.get(session.id);
      if (player) player.name = nickname;
    }
  }
  return {
    connect: (peer: WebSocket, account?: AccountIdentity) => wss.emit('connection', peer, account),
    renameCharacter,
    close,
    characters,
    worlds,
  };
}
