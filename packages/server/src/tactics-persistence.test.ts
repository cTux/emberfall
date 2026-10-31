import assert from 'node:assert/strict';
import test from 'node:test';

import { CharacterStore } from './characters.ts';
import { Peer } from './network/peer.ts';
import { createRuntime } from './runtime.ts';

import { tactics, hero } from './tactics.fixture.ts';

test('tactics save per class, round trip through persistence, and missing old-save tactics retain defaults', async () => {
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const created = store.create('Tactician');
    assert.equal(created.progress.tactics, undefined);
    const p = { ...hero('warrior'), ...created.progress, classes: created.classes };
    p.tactics = { ...tactics(), keepTarget: true };
    store.save(created.id, p.name, p);
    store.selectClass(created.id, p, 'druid');
    assert.equal(p.tactics, undefined);
    p.tactics = { ...tactics(), stance: 'passive' };
    store.save(created.id, p.name, p);
    store.selectClass(created.id, p, 'warrior');
    assert.equal(p.tactics.keepTarget, true);
    assert.equal(store.load(created.token).classes.druid.tactics!.stance, 'passive');
  } finally {
    store.close();
  }
});

test('failed saves, malformed commands and a mismatched class cannot publish tactics', async (t) => {
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
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Tactician', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++) {
      await new Promise((resolve) => {
        return setTimeout(resolve, 10);
      });
    }

    const p = [...world.players.values()][0];
    const command = {
      type: 'setTactics',
      classId: 'warrior',
      tactics: { ...tactics(), keepTarget: true },
    };
    peer.receive({ ...command, classId: 'mage' });
    assert.equal(p.tactics, undefined);
    peer.receive({ ...command, tactics: { ...command.tactics, offensive: ['elite'] } });
    assert.equal(p.tactics, undefined);
    const failure = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('write failed');
    });
    peer.receive(command);
    assert.equal(p.tactics, undefined);
    assert.match(messages.at(-1)!.message!, /Unable to save/);
    failure.mock.restore();
    peer.receive(command);
    assert.equal(p.tactics!.keepTarget, true);
    peer.receive({ type: 'setTactics', classId: 'warrior', tactics: { healBelow: 0.5 } });
    assert.equal(p.tactics!.keepTarget, true);
    assert.equal(p.tactics!.healBelow, 0.5);
    const move = {
      type: 'moveTacticsPriority',
      classId: 'warrior',
      list: 'offensive',
      rule: 'nearest',
      direction: 1,
    };
    peer.receive(move);
    peer.receive(move);
    assert.deepEqual(p.tactics!.offensive, ['lowestHealth', 'elite', 'nearest']);
    peer.receive({ ...move, rule: 'self' });
    assert.deepEqual(p.tactics!.offensive, ['lowestHealth', 'elite', 'nearest']);
    const token = messages.find((message) => {
      return message.type === 'joined';
    })!.characterToken!;
    assert.equal(runtime.characters.load(token).progress.tactics!.keepTarget, true);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});
