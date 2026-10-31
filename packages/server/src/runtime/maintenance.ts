import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { Peer as WebSocket } from '../network/peer.ts';
import { serverLog } from '../log.ts';
import type { CharacterStore } from '../characters.ts';
import type { Sessions, Session, World, Send } from './models.ts';

export function startMaintenance({
  sessions,
  worlds,
  characters,
  send,
  leave,
  broadcastList,
}: {
  sessions: Sessions;
  worlds: ReadonlyMap<string, World>;
  characters: Pick<CharacterStore, 'save'>;
  send: Send;
  leave: (session: Session) => void;
  broadcastList: () => void;
}) {
  const heartbeat = setInterval(() => {
    for (const [ws, session] of sessions) {
      if (ws.readyState !== WebSocket.OPEN) {
        continue;
      }

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
      if (player && ws.readyState === WebSocket.OPEN) {
        player.playtimeSeconds++;
      }
    }
  }, 1000);
  const autosave = setInterval(() => {
    for (const [ws, session] of sessions) {
      const player = worlds.get(session.worldId ?? '')?.players.get(session.id);
      if (!player || !session.characterId) {
        continue;
      }

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

  return () => {
    clearInterval(heartbeat);
    clearInterval(progressTick);
    clearInterval(autosave);
  };
}
