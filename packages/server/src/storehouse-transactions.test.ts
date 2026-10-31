import { test } from 'node:test';
import assert from 'node:assert/strict';

import type { ServerMessage } from '@emberfall/common';
import { BUILDINGS } from '@emberfall/core';

import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';
import { item } from './storehouse.fixture.ts';

test('session commands require Storehouse proximity and commit before publishing, including renames', async (t) => {
  const runtime = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => {
      return messages.push(message);
    },
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Keeper', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++) {
      await new Promise((resolve) => {
        return setTimeout(resolve, 10);
      });
    }

    const player = [...world.players.values()][0];
    player.backpack = [item()];
    const command = { type: 'storeItem', tab: 0, id: player.backpack[0].id, depositing: true };
    const error = () => {
      return (messages.at(-1) as { message: string }).message;
    };

    peer.receive(command);
    assert.match(error(), /Storehouse/);
    const building = BUILDINGS.find((building) => {
      return building.id === 'storehouse';
    })!;
    player.x = building.doorX;
    player.y = building.y + 9;
    player.scene = 'forest';
    peer.receive(command);
    assert.match(error(), /Storehouse/);
    delete player.scene;
    player.hitpoints = 0;
    peer.receive(command);
    assert.match(error(), /living/);
    player.hitpoints = player.maxHitpoints;
    const before = structuredClone(player);
    const failedSave = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('Test save failure');
    });
    peer.receive(command);
    assert.match(error(), /Unable to save/);
    assert.deepEqual(player, before);
    peer.receive({ type: 'renameStorage', tab: 0, name: 'Gear' });
    assert.deepEqual(player, before);
    failedSave.mock.restore();
    peer.receive(command);
    assert.equal(player.backpack.length, 0);
    assert.equal(player.storages![0].items.length, 1);
    const move = { type: 'moveStorageItem', fromTab: 0, toTab: 2, id: command.id };
    const stored = structuredClone(player);
    const failMoveSave = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('Test save failure');
    });
    peer.receive(move);
    assert.match(error(), /Unable to save/);
    assert.deepEqual(player, stored);
    failMoveSave.mock.restore();
    peer.receive(move);
    assert.equal(player.storages![0].items.length, 0);
    assert.equal(player.storages![2].items[0].id, command.id);
    peer.receive({ ...move, fromTab: 2, toTab: 0 });
    player.x = 1000;
    peer.receive(move);
    assert.match(error(), /Storehouse/);
    assert.equal(player.storages![0].items.length, 1);
    player.x = building.doorX;
    peer.receive(command);
    assert.match(error(), /available/);
    peer.receive({ type: 'renameStorage', tab: 0, name: ' Gear ' });
    assert.equal(player.storages![0].name, 'Gear');
  } finally {
    await runtime.close();
  }
});
