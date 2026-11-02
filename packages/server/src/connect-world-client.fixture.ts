import { WebSocket } from './testing/socket.ts';
import type { ServerMessage } from '@emberfall/core/contracts';
import { once } from 'node:events';

export async function connectWorldClient(port: number, clients: WebSocket[]) {
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  const messages: ServerMessage[] = [];
  ws.on('message', (raw) => {
    return messages.push(JSON.parse(raw.toString()));
  });
  clients.push(ws);
  await once(ws, 'open');

  async function wait(predicate: (m: ServerMessage) => boolean): Promise<ServerMessage> {
    const until = Date.now() + 3000;
    while (Date.now() < until) {
      const i = messages.findIndex(predicate);

      if (i >= 0) {
        return messages.splice(i, 1)[0];
      }

      await new Promise((r) => {
        // Poll frequently enough to observe asynchronous messages without busy-waiting.
        const MESSAGE_POLL_MS = 10;

        return setTimeout(r, MESSAGE_POLL_MS);
      });
    }

    throw new Error('Timed out waiting for server message');
  }

  return {
    ws,
    messages,
    wait,
    send: (message: unknown) => {
      return ws.send(JSON.stringify(message));
    },
  };
}
