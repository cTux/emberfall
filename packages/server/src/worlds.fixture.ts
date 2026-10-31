import assert from 'node:assert/strict';
import { once } from 'node:events';
import { WebSocket } from './testing/socket.ts';
import type { ServerMessage } from '@emberfall/common';
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
        return setTimeout(r, 10);
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

export async function waitForWorldMessage(messages: ServerMessage[], type: ServerMessage['type']) {
  const deadline = Date.now() + 5000;
  while (
    !messages.some((m) => {
      return m.type === type;
    })
  ) {
    assert(Date.now() < deadline, `Missing ${type}`);
    await new Promise((resolve) => {
      return setTimeout(resolve, 5);
    });
  }

  return messages.find((m) => {
    return m.type === type;
  })!;
}
