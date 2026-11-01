import { once } from 'node:events';
import { WebSocket } from './testing/socket.ts';
import type { ServerMessage, WorldState } from '@emberfall/common';

export async function connectChatClient(port: number, sockets: WebSocket[]) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  sockets.push(ws);
  const messages: ServerMessage[] = [];
  let world: WorldState | undefined;
  ws.on('message', (raw) => {
    const message = JSON.parse(raw.toString()) as ServerMessage;
    messages.push(message);

    if (message.type === 'joined' || message.type === 'state') {
      world = message.world;
    }
  });
  await once(ws, 'open');

  return {
    ws,
    send: (message: unknown) => {
      return ws.send(JSON.stringify(message));
    },
    messages,
    get world() {
      return world;
    },
  };
}
