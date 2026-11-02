import type { ServerMessage } from '@emberfall/core/contracts';
import assert from 'node:assert/strict';

export async function waitForWorldMessage(messages: ServerMessage[], type: ServerMessage['type']) {
  const deadline = Date.now() + 5000;
  while (
    !messages.some((m) => {
      return m.type === type;
    })
  ) {
    assert(Date.now() < deadline, `Missing ${type}`);
    await new Promise((resolve) => {
      // Yield briefly while awaiting world replication in integration fixtures.
      const WORLD_MESSAGE_POLL_MS = 5;

      return setTimeout(resolve, WORLD_MESSAGE_POLL_MS);
    });
  }

  return messages.find((m) => {
    return m.type === type;
  })!;
}
