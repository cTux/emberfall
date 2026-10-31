import { EventEmitter } from 'node:events';
import { clientMessage } from '@emberfall/core';
import { validateDefinitions } from '@emberfall/core/definitions/index';
import type { ServerMessage } from '@emberfall/common';
import { isCharacterCommand, executeCharacterCommand } from './commands/character.ts';
import { Peer as WebSocket } from './network/peer.ts';
import { CharacterStore } from './characters.ts';
import { OllamaNpcDialogue, type NpcDialogue } from './npc-models.ts';
import { serverLog } from './log.ts';
import { createWorldMembership } from './runtime/world-membership.ts';
import { createWorldProjection } from './runtime/projection.ts';
import { connectSession } from './runtime/sessions.ts';
import { createAdmission } from './runtime/admission.ts';
import { startSimulation } from './runtime/simulation.ts';
import { startMaintenance } from './runtime/maintenance.ts';
import { createRealtimeCommands } from './runtime/realtime-commands.ts';
import { createWorldCommands } from './runtime/world-commands.ts';
import type { World, Session, AccountIdentity } from './runtime/models.ts';

export async function createRuntime(
  savePath = ':memory:',
  dialogue: NpcDialogue = new OllamaNpcDialogue(),
) {
  validateDefinitions();
  const characters = new CharacterStore(savePath);
  await characters.ready;
  const membership = createWorldMembership(characters, dialogue);
  const { worlds, permanentWorld, parties, villageLife, resourceOwner } = membership;
  let shuttingDown = false;
  const sessions = new Map<WebSocket, Session>();
  const wss = new EventEmitter();
  const send = (ws: WebSocket, message: ServerMessage) => {
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    if (ws.bufferedAmount > 128_000) {
      ws.terminate();

      return;
    }

    ws.send(message);
  };

  const projection = createWorldProjection(parties, resourceOwner);
  const state = projection.state;
  const list = () => {
    return projection.list(worlds, permanentWorld);
  };

  const broadcastList = () => {
    const message = list();

    for (const ws of sessions.keys()) {
      send(ws, message);
    }
  };

  const leave = (session: Session) => {
    return membership.leave(session, shuttingDown);
  };

  const admit = createAdmission({
    worlds,
    permanentWorld,
    villageLife,
    sessions,
    characters,
    state,
    send,
    broadcastList,
  });
  const realtime = createRealtimeCommands({ parties, resourceOwner, villageLife, broadcastState });
  const worldCommands = createWorldCommands({
    parties,
    villageLife,
    characters,
    state,
    leave,
    broadcastList,
    broadcastState,
  });
  wss.on('connection', (ws: WebSocket, account?: AccountIdentity) => {
    const session = connectSession(ws, sessions, {
      worlds,
      characters,
      leave,
      broadcastList,
      sendWorldList: (peer) => {
        return send(peer, list());
      },
      isClosing: () => {
        return shuttingDown;
      },
    });

    if (!session) {
      return;
    }

    const reply = (message: ServerMessage) => {
      return send(ws, message);
    };

    // Password hashing and persistence failures are caught and sent to the peer below.
    // oxlint-disable-next-line typescript/no-misused-promises
    ws.on('command', async (command: unknown) => {
      const error = (message: string) => {
        return send(ws, { type: 'error', message });
      };

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
      const context = { session, world: worlds.get(session.worldId ?? ''), now, reply, error };

      if (realtime.handles(message)) {
        realtime.execute(message, context);

        return;
      }

      if (session.busy) {
        error('Please wait for your previous request.');

        return;
      }

      if (isCharacterCommand(message)) {
        executeCharacterCommand(message, context, characters, villageLife, state);

        return;
      }

      if (worldCommands.handles(message)) {
        worldCommands.execute(message, context);

        return;
      }

      if (message.type === 'join' || message.type === 'create' || message.type === 'resume') {
        await admit(ws, session, message, now, authenticated, account);
      }
    });
  });

  function broadcastState(world: World, now: number) {
    for (const [ws, session] of sessions) {
      if (session.worldId !== world.id) {
        continue;
      }

      send(ws, { type: 'state', world: state(world, now, world.players.get(session.id)) });
    }
  }

  const stopSimulation = startSimulation({
    sessions,
    worlds,
    parties,
    resourceOwner,
    villageLife,
    characters,
    send,
    broadcastState,
  });
  const stopMaintenance = startMaintenance({
    sessions,
    worlds,
    characters,
    send,
    leave,
    broadcastList,
  });

  async function close() {
    serverLog.info('Runtime stopping', { sessions: sessions.size, worlds: worlds.size });
    shuttingDown = true;
    stopSimulation();
    stopMaintenance();
    membership.closeVillageLives();
    const failures: unknown[] = [];

    for (const session of sessions.values()) {
      clearTimeout(session.reconnectTimer);
      try {
        leave(session);
      } catch (error) {
        failures.push(error);
      }
    }

    for (const ws of sessions.keys()) {
      ws.terminate();
    }

    characters.close();

    if (failures.length) {
      throw new AggregateError(failures, 'Some characters could not be saved during shutdown');
    }

    serverLog.info('Runtime stopped');
  }

  function renameCharacter(characterId: string, nickname: string) {
    for (const session of sessions.values()) {
      if (session.characterId !== characterId) {
        continue;
      }

      const player = worlds.get(session.worldId ?? '')?.players.get(session.id);

      if (player) {
        player.name = nickname;
      }
    }
  }

  return {
    connect: (peer: WebSocket, account?: AccountIdentity) => {
      return wss.emit('connection', peer, account);
    },
    renameCharacter,
    close,
    characters,
    worlds,
    parties,
  };
}
