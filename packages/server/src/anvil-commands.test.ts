import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ServerMessage } from '@emberfall/common';
import { ANVIL } from '@emberfall/core';
import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';

test('anvil commands enforce ownership, living village proximity and stale-request protection', async () => {
  const runtime = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => {
      messages.push(message);
    },
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Smith', password: '' });

    for (let i = 0; i < 200 && !world.players.size; i++) {
      // Match the existing session fixture's short asynchronous admission polling interval.
      const ADMISSION_POLL_MS = 10;
      await new Promise((resolve) => {
        setTimeout(resolve, ADMISSION_POLL_MS);
      });
    }

    const player = [...world.players.values()][0];
    player.coins = 100;
    player.backpack = [{ id: 'owned', itemId: 'loot-helmet', quantity: 1 }];
    const command = { type: 'improveItem', id: 'owned', stars: 0 };
    const reject = (message: object, pattern: RegExp) => {
      const before = structuredClone(player);
      peer.receive(message);
      assert.match((messages.at(-1) as { message: string }).message, pattern);
      assert.deepEqual(player, before);
    };

    reject(command, /anvil/);
    Object.assign(player, { x: ANVIL!.x, y: ANVIL!.y - 15, scene: 'forest' });
    reject(command, /anvil/);
    delete player.scene;
    player.hitpoints = 0;
    reject(command, /living/);
    player.hitpoints = player.maxHitpoints;
    reject({ ...command, id: 'someone-elses-item' }, /changed/);
    peer.receive(command);
    assert.equal(player.backpack[0].stars, 1);
    assert.equal(player.coins, 90);
    reject(command, /changed/);
  } finally {
    await runtime.close();
  }
});
