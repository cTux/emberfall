import { test } from 'node:test';
import assert from 'node:assert/strict';

import { OllamaNpcDialogue, DEFAULT_NPC_MODEL } from './npc-models.ts';

import { flush, setup } from './npcs.fixture.ts';

test('outage announces silence once, keeps walking, and recovers after a shared retry interval', async () => {
  let calls = 0,
    available = false;
  const { world, life } = setup({
    generate: async () => {
      calls++;
      return available ? { status: 'ok', text: 'My voice is back!' } : { status: 'unavailable' };
    },
  });
  life.tick(10_000, 0);
  await flush();
  assert(world.npcs!.every((npc) => npc.silenced));
  assert.equal(world.chat!.length, 1);
  assert.equal(world.chat![0].tone, 'danger');
  life.tick(40_000, 0);
  assert.equal(calls, 1);
  life.tick(70_000, 0);
  await flush();
  assert.equal(world.chat!.length, 1);
  available = true;
  life.tick(130_000, 0);
  await flush();
  assert(world.npcs!.every((npc) => !npc.silenced));
  assert.equal(world.chat!.filter((m) => m.tone === 'success').length, 1);
  life.close();
});

test('Ollama outage and recovery restore village speech through the real provider', async (t) => {
  t.mock.method(console, 'info', () => {});
  let now = 10_000,
    available = false;
  const request: typeof fetch = async () =>
    available
      ? Response.json({ message: { content: 'My voice is back!' }, done: true })
      : new Response('', { status: 503 });
  const provider = new OllamaNpcDialogue(request, () => now, {
    baseUrl: 'http://127.0.0.1:11434',
    model: DEFAULT_NPC_MODEL,
  });
  const { world, life } = setup(provider);
  try {
    life.tick(now, 0);
    await flush();
    assert(world.npcs!.every((npc) => npc.silenced));
    available = true;
    now = 70_000;
    life.tick(now, 0);
    await flush();
    assert(world.npcs!.every((npc) => !npc.silenced));
    assert.equal(world.npcs![0].chat, 'My voice is back!');
    assert.equal(world.chat!.at(-1)!.text, 'My voice is back!');
    assert.equal(world.chat!.filter((message) => message.tone === 'success').length, 1);
  } finally {
    life.close();
  }
});
