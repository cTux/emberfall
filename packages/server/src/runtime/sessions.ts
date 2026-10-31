import { randomUUID } from 'node:crypto';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import type { Peer as WebSocket } from '../network/peer.ts';
import { serverLog } from '../log.ts';
import type { CharacterStore } from '../characters.ts';
import type { Sessions, Session, World } from './models.ts';

export function connectSession(
  ws: WebSocket,
  sessions: Sessions,
  {
    worlds,
    characters,
    leave,
    broadcastList,
    sendWorldList,
    isClosing,
  }: {
    worlds: ReadonlyMap<string, World>;
    characters: Pick<CharacterStore, 'save'>;
    leave: (session: Session) => void;
    broadcastList: () => void;
    sendWorldList: (peer: WebSocket) => void;
    isClosing: () => boolean;
  },
) {
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
  sendWorldList(ws);
  ws.on('error', () => ws.terminate());
  ws.on('pong', () => {
    session.alive = true;
  });
  ws.on('close', (code: number) => {
    serverLog.info('Client disconnected', { sessionId: session.id, code });
    if (isClosing()) {
      sessions.delete(ws);
      return;
    }
    if (session.worldId && !isClosing() && code !== 1008) {
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
        delete player.gathering;
        player.inputX = player.inputY = 0;
      }
      session.reconnectTimer = setTimeout(() => {
        try {
          leave(session);
          sessions.delete(ws);
          broadcastList();
        } catch (error) {
          serverLog.error('Character save failed on reconnect expiry; autosave will retry:', error);
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
  return session;
}
