import type * as RuntimeModels from './models.ts';
import { randomUUID, randomBytes, timingSafeEqual } from 'node:crypto';
import { createWorldPasswords } from './passwords.ts';
import { MAX_PLAYERS } from '@emberfall/core';
import { spawnPlayer } from './spawn-player.ts';
import { Peer as WebSocket } from '../network/peer.ts';
import { createPlayers } from '../ecs/simulation.ts';
import { addChat } from '../chat.ts';
import { serverLog } from '../log.ts';
import type { CharacterStore } from '../characters.ts';
import type { WorldMembership } from './world-membership.ts';

export function createAdmission({
  worlds,
  permanentWorld,
  villageLife,
  sessions,
  characters,
  state,
  send,
  broadcastList,
}: Pick<WorldMembership, 'worlds' | 'permanentWorld' | 'villageLife'> & {
  sessions: RuntimeModels.Sessions;
  characters: Pick<
    CharacterStore,
    | 'loadById'
    | 'load'
    | 'canResume'
    | 'saveWorld'
    | 'merchant'
    | 'create'
    | 'save'
    | 'rememberWorld'
    | 'deleteWorld'
  >;
  state: RuntimeModels.Snapshot;
  send: RuntimeModels.Send;
  broadcastList: () => void;
}) {
  const passwords = createWorldPasswords();

  return async (
    ws: WebSocket,
    session: RuntimeModels.Session,
    message: RuntimeModels.AdmissionMessage,
    now: number,
    authenticated: ReturnType<RuntimeModels.AccountIdentity>,
    account?: RuntimeModels.AccountIdentity,
  ) => {
    const error = (message: string) => {
      return send(ws, { type: 'error', message });
    };

    if (session.worldId) {
      error('Leave your current world first.');

      return;
    }

    if (now - session.actionAt > 10_000) {
      session.actionAt = now;
      session.actions = 0;
    }

    if (++session.actions > 5 || passwords.pending >= 8) {
      error('Too many attempts. Try again in a moment.');

      return;
    }

    session.busy = true;
    let createdWorld: RuntimeModels.World | undefined;
    try {
      const existingCharacter = authenticated
        ? characters.loadById(authenticated.characterId)
        : message.characterToken
          ? characters.load(message.characterToken)
          : undefined;
      const active = () => {
        return (
          existingCharacter &&
          [...sessions.values()].some((s) => {
            return s.worldId && s.characterId === existingCharacter.id;
          })
        );
      };

      if (message.type !== 'resume' && active()) {
        error('This character is already playing in another tab. Leave that world first.');

        return;
      }

      if (message.type === 'resume') {
        const retained = [...sessions.entries()].find(([oldWs, old]) => {
          return (
            oldWs.readyState === WebSocket.CLOSED &&
            old.characterId === existingCharacter?.id &&
            old.worldId === message.worldId &&
            (old.reconnectUntil ?? 0) > now
          );
        });
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

      let world: RuntimeModels.World;

      if (message.type === 'create') {
        if (worlds.size >= 64) {
          error('The server is full. Try again later.');

          return;
        }

        const salt = randomBytes(16).toString('hex');
        let hash: Buffer | undefined;

        if (message.password) {
          hash = await passwords.hash(message.password, salt);
        }

        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }

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
          const hash = await passwords.hash(message.password, world.salt);

          if (!timingSafeEqual(hash, world.hash)) {
            error('Incorrect world password.');

            return;
          }
        }

        if (ws.readyState !== WebSocket.OPEN) {
          return;
        }

        if (!worlds.has(world.id)) {
          error('This world has closed.');

          return;
        }

        if (world.players.size >= (world === permanentWorld ? 32 : MAX_PLAYERS)) {
          error('This world is full.');

          return;
        }
      }

      world.merchant ??= characters.merchant(world.id);

      if (active()) {
        error('This character is already playing in another tab.');

        return;
      }

      // Password hashing yields; refresh after it so a recent save cannot be overwritten.
      if (ws.readyState !== WebSocket.OPEN || (account && !account()?.nickname)) {
        return;
      }

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
      spawnPlayer(world, session.id, playerName, character);
      villageLife(world, now);

      if (createdWorld) {
        serverLog.info('World created', { worldId: world.id });
      }

      serverLog.info(message.type === 'resume' ? 'Player resumed world' : 'Player joined world', {
        sessionId: session.id,
        worldId: world.id,
        players: world.players.size,
      });

      if (!world.hostId) {
        world.hostId = session.id;
      }

      addChat(world, `${playerName} joined.`, undefined, session.id);
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
  };
}
