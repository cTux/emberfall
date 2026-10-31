import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player } from '@emberfall/common';
import { talentNodeId, talentRank, availableTalentPoints, BULLSEYE } from '@emberfall/core';

import { CharacterStore } from './characters.ts';
import { hero, ability } from './talents.fixture.ts';

test('save failure cannot publish learned points or equipped slots; bullseye reset remains transactional', async (t) => {
  const { createRuntime } = await import('./runtime.ts');
  const { Peer } = await import('./network/peer.ts');
  const runtime = await createRuntime();
  const messages: { type: string; message?: string; characterToken?: string }[] = [];
  const peer = new Peer(
    (message) => {
      return messages.push(message);
    },
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Talent hero', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++) {
      await new Promise((resolve) => {
        return setTimeout(resolve, 10);
      });
    }

    const player = [...world.players.values()][0];
    player.level = 20;
    const id = talentNodeId('warrior', 0, 1);
    const fail = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('failed save');
    });
    peer.receive({ type: 'learnTalent', nodeId: id });
    assert.match(messages.at(-1)!.message!, /Unable to save/);
    assert.equal(talentRank(player, id), 0);
    fail.mock.restore();
    peer.receive({ type: 'learnTalent', nodeId: id });
    assert.equal(talentRank(player, id), 1);
    peer.receive({ type: 'equipTalent', slot: 0, nodeId: id });
    assert.equal(player.talentSlots?.[0], id);
    player.coins = 100;
    peer.receive({ type: 'resetTalents', classId: 'warrior' });
    assert.equal(player.coins, 100);
    player.x = BULLSEYE!.x;
    player.y = BULLSEYE!.y - 15;
    peer.receive({ type: 'resetTalents', classId: 'warrior' });
    assert.equal(player.coins, 50);
    assert.equal(availableTalentPoints(player), 20);
    const token = messages.find((message) => {
      return message.type === 'joined';
    })!.characterToken!;
    const saved = runtime.characters.load(token);
    assert.equal(saved.progress.coins, 50);
    assert.equal(availableTalentPoints(saved.progress), 20);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});

test('per-class allocations and selected abilities survive a save round trip', async () => {
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const created = store.create('Talent hero');
    const player = {
      ...hero(),
      ...created.progress,
      classId: 'warrior',
      level: 20,
      classes: created.classes,
    } as Player;
    ability(player, 0, 1, 2);
    store.save(created.id, player.name, player);
    const loaded = store.load(created.token);
    assert.equal(talentRank(loaded.progress, talentNodeId('warrior', 0, 1)), 2);
    assert.equal(loaded.progress.talentSlots?.[0], talentNodeId('warrior', 0, 1));
    assert.equal(availableTalentPoints(loaded.classes.mage), 1);
  } finally {
    store.close();
  }
});
