import { test } from 'node:test';
import assert from 'node:assert/strict';

import { flush, player, setup } from './npcs.fixture.ts';

test('automatic greetings are bounded across multiple players and explicit replies still work', async () => {
  let calls = 0;
  const { world, life } = setup({
    generate: async () => {
      calls++;

      return { status: 'ok', text: 'Hello!' };
    },
  });
  world.players.set('q', player('q'));
  life.tick(10_000, 0);
  await flush();
  assert.equal(calls, 1);
  assert.equal(world.chat![0].dimension, 'village');
  assert.equal(world.chat![0].npcId, 'innkeeper');
  for (let time = 10_050; time < 45_000; time += 50) {
    life.tick(time, 0);
  }

  assert.equal(calls, 1);
  life.hear(world.players.get('p')!, '@Marta How are you?', 45_000);
  life.tick(45_000, 0);
  life.tick(46_999, 0);
  await flush();
  assert.equal(calls, 1);
  assert.equal(world.chat!.length, 1);
  life.tick(47_000, 0);
  await flush();
  assert.equal(calls, 2);
  assert.equal(world.chat!.length, 2);
  life.close();
});

test('nearby NPCs wait two seconds to answer and stop without another mention; other-dimension players do not trigger greetings', async () => {
  let calls = 0;
  const { world, life } = setup({
    generate: async () => {
      calls++;

      return { status: 'ok', text: 'Fine weather.' };
    },
  });
  world.players.get('p')!.x = 2000;
  world.npcs![1].x = world.npcs![0].x + 50;
  world.npcs![1].y = world.npcs![0].y;
  life.tick(10_000, 0);
  await flush();
  life.tick(11_999, 0);
  await flush();
  assert.equal(calls, 1);
  assert.equal(world.chat!.length, 1);
  life.tick(12_000, 0);
  await flush();
  assert.equal(calls, 2);
  assert.equal(world.chat![1].npcId, 'hallkeeper');
  life.tick(20_000, 0);
  assert.equal(calls, 2);
  life.close();
  const other = setup({
    generate: async () => {
      throw new Error('must not be called');
    },
  });
  other.world.players.get('p')!.scene = 'forest';
  other.life.tick(100_000, 1);
  await flush();
  assert.equal(other.world.chat, undefined);
  other.life.close();
});

test('mentions in a player greeting trigger delayed NPC replies capped at five lines', async () => {
  const contexts: {
    character: string;
    listenerMention?: string;
    residents: string[];
    setting: string;
  }[] = [];
  const { world, life } = setup({
    generate: async (context) => {
      const parsed = JSON.parse(context);
      contexts.push(parsed);

      return {
        status: 'ok',
        text: parsed.character.startsWith('Marta')
          ? '“Oswin the Steward, are goblins charging a mud tax?”'
          : '"@Marta, only if they can count their boots."',
      };
    },
  });
  Object.assign(world.npcs![1], { x: world.npcs![0].x + 50, y: world.npcs![0].y });
  life.tick(10_000, 0);
  await flush();
  for (let i = 1; i < 5; i++) {
    life.tick(10_000 + i * 2000 - 1, 0);
    await flush();
    assert.equal(contexts.length, i);
    assert.equal(world.chat!.length, i);
    life.tick(10_000 + i * 2000, 0);
    await flush();
  }

  assert.equal(world.chat!.length, 5);
  assert.deepEqual(
    world.chat!.map((line) => {
      return line.npcId;
    }),
    ['innkeeper', 'hallkeeper', 'innkeeper', 'hallkeeper', 'innkeeper'],
  );
  assert.match(world.chat![0].text, /^@Oswin the Steward/);
  assert(
    world.chat!.every((line) => {
      return !/["“”]/u.test(line.text) && line.text.length <= 120;
    }),
  );
  assert.equal(contexts[1].listenerMention, '@Marta');
  assert(contexts[0].residents.includes('@Nell: Nell the Pathfinder'));
  assert.match(contexts[0].setting, /Brute Boss/);
  life.tick(20_000, 0);
  await flush();
  assert.equal(contexts.length, 5, 'mutual mentions cannot create an endless exchange');
  life.close();
});

test('automatic starts wait twice as long while player replies bypass that interval', async () => {
  let calls = 0;
  const { world, life } = setup({
    generate: async () => {
      calls++;

      return { status: 'ok', text: 'Mind the forest goblins.' };
    },
  });
  // Each NPC and player can participate, so only the village start interval gates the second greeting.
  world.npcs!.forEach((npc, i) => {
    Object.assign(npc, { x: 300 + i * 500, y: 250 });
    world.players.set(`listener${i}`, player(`listener${i}`, npc.x, npc.y));
  });
  life.tick(10_000, 0);
  await flush();
  life.tick(97_999, 0);
  await flush();
  assert.equal(calls, 1);
  life.hear(world.players.get('p')!, '@Marta Any forest news?', 97_999);
  life.tick(99_999, 0);
  await flush();
  assert.equal(calls, 2);
  life.tick(100_000, 0);
  await flush();
  assert.equal(calls, 3, 'a reply does not postpone the next automatic start');
  life.close();
});
