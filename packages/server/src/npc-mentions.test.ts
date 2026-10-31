import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ARENA } from '@emberfall/core';

import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import { flush, player, setup } from './npcs.fixture.ts';

test('players can mention any nearby resident anywhere in speech with or without @', async () => {
  for (const definition of VILLAGE_DEFINITION.villagers) {
    const name = definition.name.split(' ')[0];

    for (const text of [
      `@${name} Hello!`,
      `Hello, @${name}!`,
      `Any advice, ${name.toUpperCase()}?`,
      `@${name}`,
    ]) {
      const contexts: { listener: string; quotedSpeech: string }[] = [];
      const { world, life } = setup({
        generate: async (context) => {
          contexts.push(JSON.parse(context));

          return { status: 'ok', text: 'Watch out for goblins!' };
        },
      });
      try {
        const resident = world.npcs!.find((npc) => {
          return npc.id === definition.id;
        })!;
        Object.assign(world.players.get('p')!, { x: resident.x, y: resident.y });
        life.hear(world.players.get('p')!, text, 1000);
        life.tick(2999, 0);
        assert.equal(contexts.length, 0);
        life.tick(3000, 0);
        await flush();
        assert.equal(contexts.length, 1, text);
        assert.equal(contexts[0].listener, 'p');
        assert.equal(contexts[0].quotedSpeech, text);
        assert.equal(world.chat!.at(-1)!.npcId, definition.id);
      } finally {
        life.close();
      }
    }
  }
});

test('player mentions require a whole name, a live village player and wrapped range', async () => {
  for (const scenario of [
    'partial',
    'prefix',
    'unicode',
    'distance',
    'scene',
    'death',
    'disconnect',
    'boundary',
    'wrapped',
  ] as const) {
    let calls = 0;
    const { world, life } = setup({
      generate: async () => {
        calls++;

        return { status: 'ok', text: 'Hello!' };
      },
    });
    try {
      const listener = world.players.get('p')!;
      const marta = world.npcs![0];
      Object.assign(listener, { x: marta.x, y: marta.y });
      let text = 'Hello, @Marta!';

      if (scenario === 'partial') {
        text = 'Hello, @Martabelle!';
      }

      if (scenario === 'prefix') {
        text = 'Hello, xMarta!';
      }

      if (scenario === 'unicode') {
        text = 'Hello, éMarta!';
      }

      if (scenario === 'distance') {
        listener.x += 121;
      }

      if (scenario === 'scene') {
        listener.scene = 'forest';
      }

      if (scenario === 'death') {
        listener.hitpoints = 0;
      }

      if (scenario === 'disconnect') {
        listener.reconnecting = true;
      }

      if (scenario === 'boundary') {
        listener.x += 120;
      }

      if (scenario === 'wrapped') {
        marta.x = ARENA.width - 5;
        listener.x = 5;
      }

      life.hear(listener, text, 1000);
      life.tick(3000, 0);
      await flush();
      assert.equal(calls, scenario === 'boundary' || scenario === 'wrapped' ? 1 : 0, scenario);
    } finally {
      life.close();
    }
  }
});

test('the first nearby mentioned resident replies and player and village cooldowns still apply', async () => {
  let calls = 0;
  const { world, life } = setup({
    generate: async () => {
      calls++;

      return { status: 'ok', text: 'Hello!' };
    },
  });
  try {
    const listener = world.players.get('p')!;
    const oswin = world.npcs![1];
    Object.assign(oswin, { x: listener.x, y: listener.y });
    world.players.set('q', player('q'));
    life.hear(listener, 'Nell is away, but Oswin and Marta are here!', 1000);
    life.tick(3000, 0);
    await flush();
    assert.equal(calls, 1);
    assert.equal(world.chat!.at(-1)!.npcId, oswin.id);
    life.hear(world.players.get('q')!, 'Hello, Marta!', 3500);
    life.tick(5500, 0);
    await flush();
    assert.equal(calls, 1, 'village cooldown');
    life.hear(listener, 'Hello, Marta!', 6000);
    life.tick(8000, 0);
    await flush();
    assert.equal(calls, 1, 'player cooldown');
    life.hear(listener, 'Hello, Marta!', 11_000);
    life.tick(13_000, 0);
    await flush();
    assert.equal(calls, 2);
    assert.equal(world.chat!.at(-1)!.npcId, 'innkeeper');
  } finally {
    life.close();
  }
});

test('mentions do not summon distant NPCs and truncated names cannot trigger replies', async () => {
  for (const text of ['@Nell, how is the forest?', 'The goblins found Oswinter.']) {
    let calls = 0;
    const { life } = setup({
      generate: async () => {
        calls++;

        return { status: 'ok', text };
      },
    });
    life.tick(10_000, 0);
    await flush();
    life.tick(12_000, 0);
    await flush();
    assert.equal(calls, 1);
    life.close();
  }
});
