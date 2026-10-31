import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Encoder, Decoder } from '@colyseus/schema';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';
import { CLASS_IDS, starterEquipment } from '@emberfall/core';

import type { WorldState } from '@emberfall/common';
import { CharacterStore, decodeProgress, freshProgress } from './characters.ts';

import { hero, scene } from './equipment.fixture.ts';

test('legacy saves acquire class-specific equipment; empty loadouts and class switching persist', async () => {
  const legacy = decodeProgress(
    JSON.stringify({
      classId: 'mage',
      classes: Object.fromEntries(CLASS_IDS.map((id) => [id, freshProgress()])),
    }),
  );
  for (const id of CLASS_IDS) assert.deepEqual(legacy.classes[id].equipment, starterEquipment(id));
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const created = store.create('Hero');
    const player = { ...hero(), ...created.progress, classes: created.classes };
    player.equipment = {};
    store.save(created.id, player.name, player);
    store.selectClass(created.id, player, 'mage');
    assert.deepEqual(player.equipment, starterEquipment('mage'));
    store.selectClass(created.id, player, 'warrior');
    assert.deepEqual(player.equipment, {});
    assert.deepEqual(store.load(created.token).progress.equipment, {});
    assert.throws(() =>
      store.save(created.id, player.name, { ...player, equipment: { weapon: 'mage-staff' } }),
    );
    assert.deepEqual(store.load(created.token).progress.equipment, {});
  } finally {
    store.close();
  }
});

test('native protocol patches retain equipment and typed critical damage in detached snapshots', () => {
  const world: WorldState = {
    id: 'w',
    name: 'World',
    hostId: 'p',
    players: [hero('mage')],
    training: scene(),
  };
  world.training!.damage = [
    {
      id: 50,
      target: 'enemy:1',
      x: 2420,
      y: 1280,
      at: 1000,
      amount: 4.5,
      ownerId: 'p',
      damageType: 'fire',
      critical: true,
    },
  ];
  const state = new SessionState(),
    received = new SessionState();
  const encoder = new Encoder(state),
    decoder = new Decoder(received);
  projectState(state, world);
  decoder.decode(encoder.encodeAll());
  encoder.discardChanges();
  const first = materializeState(received)!;
  assert.deepEqual(first.players[0].equipment, starterEquipment('mage'));
  assert.deepEqual(first.training!.damage, world.training!.damage);
  world.players[0].equipment = {};
  projectState(state, world);
  decoder.decode(encoder.encode());
  assert.deepEqual(materializeState(received)!.players[0].equipment, {});
  assert.deepEqual(first.players[0].equipment, starterEquipment('mage'));
});
