import { GameConnection } from './connection';
import type { ServerMessage } from '@emberfall/common';

export function connectionLatency(ws: GameConnection, setLatency: (value: number | null) => void) {
  let probeId = 0;
  let pendingProbe: { id: number; at: number } | null = null;
  const ping = () => {
    if (ws.readyState !== GameConnection.OPEN) {
      return;
    }

    const now = performance.now();

    if (pendingProbe && now - pendingProbe.at < 5000) {
      return;
    }

    if (pendingProbe) {
      setLatency(null);
    }

    pendingProbe = { id: ++probeId, at: now };
    ws.send({ type: 'ping', id: probeId });
  };

  return {
    ping,
    receive(message: ServerMessage) {
      if (message.type === 'pong' && pendingProbe?.id === message.id) {
        setLatency(Math.max(0, Math.round(performance.now() - pendingProbe.at)));
        pendingProbe = null;
      }
    },
  };
}
