import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player } from '@emberfall/common';
import { nearbyInteraction, ARENA } from '@emberfall/core';
import { VillageLife, type NpcWorld } from './npcs.ts';
import type { NpcDialogue, DialogueResult } from './npc-models.ts';
import { OllamaNpcDialogue, DEFAULT_NPC_MODEL } from './npc-models.ts';
import { createPlayers, simulationFor } from './ecs/simulation.ts';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';
import { SnapshotBuffer } from '../../client/src/snapshots.ts';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
const player = (id = 'p', x = 300, y = 250) => ({ id, name: id, x, y, hitpoints: 100 }) as Player;
function setup(
  dialogue: NpcDialogue = { generate: async () => ({ status: 'ok', text: 'Good morning!' }) },
) {
  const world: NpcWorld = { players: createPlayers() };
  world.players.set('p', player());
  const life = new VillageLife(world, dialogue, 0);
  return { world, life };
}

test('every resident sends their own personality to Ollama for greetings, player replies and NPC answers', async () => {
  const definitions = VILLAGE_DEFINITION.villagers;
  assert.equal(new Set(definitions.map((npc) => npc.personality)).size, definitions.length);
  for (const definition of definitions) {
    for (const kind of ['greeting', 'reply', 'exchange'] as const) {
      const contexts: { character: string; personality: string; quotedSpeech?: string }[] = [];
      const request: typeof fetch = async (_url, options) => {
        const body = JSON.parse(options!.body as string);
        const context = JSON.parse(body.messages[1].content);
        contexts.push(context);
        const text =
          kind === 'exchange' && contexts.length === 1
            ? `@${definition.name.split(' ')[0]}, the goblins stole my boots.`
            : 'The goblins finally found their sole purpose.';
        return Response.json({ message: { content: text }, done: true });
      };
      const { world, life } = setup(
        new OllamaNpcDialogue(request, () => 0, {
          baseUrl: 'http://127.0.0.1:11434',
          model: DEFAULT_NPC_MODEL,
        }),
      );
      try {
        const resident = world.npcs!.find((npc) => npc.id === definition.id)!;
        world.npcs!.forEach((npc, i) => Object.assign(npc, { x: 1000 + i * 500, y: 1000 }));
        Object.assign(resident, { x: 300, y: 250 });
        if (kind === 'exchange') {
          world.players.get('p')!.x = 4000;
          // The first resident in scheduler order speaks to the resident under test.
          const initiator = world.npcs!.find((npc) => npc.id !== resident.id)!;
          Object.assign(initiator, { x: 350, y: 250 });
          world.npcs = [initiator, resident];
          life.tick(10_000, 0);
          await flush();
          life.tick(12_000, 0);
        } else if (kind === 'reply') {
          life.hear(world.players.get('p')!, `@${definition.name.split(' ')[0]} Any advice?`, 1000);
          life.tick(3000, 0);
        } else {
          life.tick(10_000, 0);
        }
        await flush();
        assert.equal(contexts.length, kind === 'exchange' ? 2 : 1);
        const context = contexts.at(-1)!;
        assert.equal(context.character, definition.name);
        assert.equal(context.personality, definition.personality);
        assert.equal(!!context.quotedSpeech, kind !== 'greeting');
        assert.equal(world.chat!.at(-1)!.npcId, definition.id);
      } finally {
        life.close();
      }
    }
  }
});

test('four residents walk near players, pause during interaction, and release authoritative ECS entities', () => {
  const { world, life } = setup();
  assert.deepEqual(
    world.npcs!.map((n) => n.buildingId),
    ['inn', 'hall', 'workshop', 'lodge'],
  );
  assert.equal(simulationFor(world.players)!.villagers.size, 4);
  const marta = world.npcs![0],
    initial = { x: marta.x, y: marta.y };
  life.tick(9000, 0.05);
  assert(marta.moving);
  assert(Math.hypot(marta.x - initial.x, marta.y - initial.y) <= 38 * 0.05 + 0.001);
  assert.notEqual(marta.y, initial.y);
  life.interact(world.players.get('p')!, marta.id);
  const paused = { x: marta.x, y: marta.y };
  life.tick(9050, 0.05);
  assert.equal(marta.moving, false);
  assert.deepEqual({ x: marta.x, y: marta.y }, paused);
  life.interact(world.players.get('p')!, null);
  life.tick(9075, 0.05);
  assert(marta.moving, 'closing the interaction releases Marta while the player stays nearby');
  world.players.clear();
  life.tick(9100, 0.05);
  assert.equal(marta.moving, false);
  life.close();
  assert.equal(simulationFor(world.players)!.villagers.size, 0);
});

test('interactions validate live wrapped range and release invalid traders without resuming stale interactions', () => {
  for (const action of ['distance', 'scene', 'death', 'disconnect', 'leave'] as const) {
    const { world, life } = setup();
    const trader = world.players.get('p')!;
    world.players.set('observer', player('observer', 2000, 2000));
    const marta = world.npcs![0];
    Object.assign(marta, { x: ARENA.width - 5, y: 238 });
    Object.assign(trader, { x: 5, y: 223 });
    life.interact(trader, marta.id);
    life.tick(9000, 0.05);
    assert.equal(marta.moving, false, 'trading works across a wrapped seam');
    if (action === 'distance') trader.x = 1000;
    if (action === 'scene') trader.scene = 'forest';
    if (action === 'death') trader.hitpoints = 0;
    if (action === 'disconnect') trader.reconnecting = true;
    if (action === 'leave') world.players.delete(trader.id);
    life.tick(9050, 0.05);
    assert(marta.moving, action);
    Object.assign(trader, { x: 5, scene: undefined, hitpoints: 100, reconnecting: false });
    world.players.set(trader.id, trader);
    life.tick(9100, 0.05);
    assert(marta.moving, 'returning to range does not reopen the interaction');
    life.close();
  }
});

test('remote or invalid interactions cannot stop residents and multiple traders release independently', () => {
  const { world, life } = setup();
  const trader = world.players.get('p')!;
  const marta = world.npcs![0];
  trader.x = 1000;
  life.interact(trader, marta.id);
  life.tick(9000, 0.05);
  assert(marta.moving);
  Object.assign(trader, { x: marta.x, y: marta.y - 15 });
  life.interact(trader, 'unknown');
  life.tick(9050, 0.05);
  assert(marta.moving);
  const second = player('q', marta.x, marta.y - 15);
  world.players.set(second.id, second);
  life.interact(trader, marta.id);
  life.interact(second, marta.id);
  life.interact(trader, null);
  life.tick(9100, 0.05);
  assert.equal(marta.moving, false, 'another active trader still holds Marta');
  life.interact(second, null);
  life.tick(9150, 0.05);
  assert(marta.moving);
  life.close();
});

test('residents choose separate destinations and leave the circuit with randomized pauses', () => {
  let roll = 0;
  const world: NpcWorld = { players: createPlayers() };
  world.players.set('p', player('p', 2000, 2000));
  const life = new VillageLife(
    world,
    { generate: async () => ({ status: 'busy' }) },
    0,
    () => roll,
  );
  const npcs = world.npcs!;
  // Even identical random rolls give co-located residents different destinations.
  for (const npc of npcs) Object.assign(npc, { x: 400, y: 400 });
  life.tick(4999, 0.05);
  assert(npcs.every((npc) => !npc.moving));
  life.tick(5000, 0.05);
  assert(npcs.every((npc) => npc.moving));
  assert.equal(new Set(npcs.map((npc) => npc.angle)).size, 4);
  // Keep conversations from interrupting the pause measurement.
  for (const [index, npc] of npcs.slice(1).entries())
    Object.assign(npc, { x: 1000 + index * 300, y: 1000 });

  const marta = npcs[0];
  Object.assign(marta, VILLAGE_DEFINITION.npcStops[0]);
  roll = 0.99;
  life.tick(6000, 0);
  assert.equal(marta.moving, false);
  life.tick(14_959, 0.05);
  assert.equal(marta.moving, false);
  life.tick(14_960, 0.05);
  assert.equal(marta.moving, true);
  const destination = VILLAGE_DEFINITION.npcStops.at(-1)!;
  assert.equal(marta.angle, Math.atan2(destination.y - 320, destination.x - 330));
  life.close();
});

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
  for (let time = 10_050; time < 45_000; time += 50) life.tick(time, 0);
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
        const resident = world.npcs!.find((npc) => npc.id === definition.id)!;
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
      if (scenario === 'partial') text = 'Hello, @Martabelle!';
      if (scenario === 'prefix') text = 'Hello, xMarta!';
      if (scenario === 'unicode') text = 'Hello, éMarta!';
      if (scenario === 'distance') listener.x += 121;
      if (scenario === 'scene') listener.scene = 'forest';
      if (scenario === 'death') listener.hitpoints = 0;
      if (scenario === 'disconnect') listener.reconnecting = true;
      if (scenario === 'boundary') listener.x += 120;
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

test('queued player mentions revalidate participants after the delay and cancel on disposal', async () => {
  for (const action of ['scene', 'distance', 'death', 'disconnect', 'leave', 'close'] as const) {
    let calls = 0;
    const { world, life } = setup({
      generate: async () => {
        calls++;
        return { status: 'ok', text: 'Hello!' };
      },
    });
    const listener = world.players.get('p')!;
    world.players.set('observer', player('observer', 2000, 2000));
    life.hear(listener, '@Marta Hello!', 1000);
    life.tick(2999, 0);
    assert.equal(calls, 0);
    if (action === 'scene') listener.scene = 'forest';
    if (action === 'distance') listener.x += 1000;
    if (action === 'death') listener.hitpoints = 0;
    if (action === 'disconnect') listener.reconnecting = true;
    if (action === 'leave') world.players.delete(listener.id);
    if (action === 'close') life.close();
    life.tick(3000, 0);
    await flush();
    assert.equal(calls, 0, action);
    assert.equal(world.chat, undefined, action);
    life.close();
  }
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
    world.chat!.map((line) => line.npcId),
    ['innkeeper', 'hallkeeper', 'innkeeper', 'hallkeeper', 'innkeeper'],
  );
  assert.match(world.chat![0].text, /^@Oswin the Steward/);
  assert(world.chat!.every((line) => !/["“”]/u.test(line.text) && line.text.length <= 120));
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

test('busy mention replies retry promptly without losing the conversation or its limit', async () => {
  let calls = 0;
  const { world, life } = setup({
    generate: async () => {
      calls++;
      if (calls === 2) return { status: 'busy' };
      return {
        status: 'ok',
        text: calls === 1 ? '@Oswin, goblins ate the ledger.' : '@Marta, again?',
      };
    },
  });
  Object.assign(world.npcs![1], { x: 350, y: 250 });
  life.tick(10_000, 0);
  await flush();
  life.tick(12_000, 0);
  await flush();
  assert.equal(world.chat!.length, 1);
  life.tick(12_499, 0);
  assert.equal(calls, 2);
  life.tick(12_500, 0);
  await flush();
  assert.equal(world.chat![1].npcId, 'hallkeeper');
  life.close();
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

test('late answers are discarded after scene transfer, range exit or world disposal', async () => {
  for (const action of ['scene', 'distance', 'close'] as const) {
    let finish!: (result: DialogueResult) => void;
    const { world, life } = setup({
      generate: () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    });
    life.tick(10_000, 0);
    if (action === 'scene') world.players.get('p')!.scene = 'forest';
    if (action === 'distance') world.players.get('p')!.x += 1000;
    if (action === 'close') life.close();
    finish({ status: 'ok', text: 'Too late!' });
    await flush();
    assert.equal(world.chat, undefined);
    life.close();
  }
});

test('moving Marta owns wrapped trading range, protocol deltas and detached interpolation', () => {
  const { world, life } = setup();
  const npc = world.npcs![0];
  npc.x = ARENA.width - 5;
  assert.equal(
    nearbyInteraction({ x: 5, y: npc.y - 15, hitpoints: 100 }, false, undefined, world.npcs)?.id,
    'innkeeper',
  );
  assert.equal(
    nearbyInteraction({ x: 300, y: 223, hitpoints: 100 }, false, undefined, world.npcs),
    null,
  );
  const state = new SessionState();
  const snapshot = {
    id: 'w',
    name: 'w',
    hostId: 'p',
    players: [],
    npcs: world.npcs,
    serverNow: 1000,
  };
  projectState(state, snapshot);
  const a = materializeState(state)!;
  npc.x = 5;
  projectState(state, { ...snapshot, serverNow: 1100 });
  const b = materializeState(state)!;
  assert.equal(a.npcs![0].x, ARENA.width - 5);
  assert.equal(b.npcs![0].x, 5);
  const buffer = new SnapshotBuffer('p');
  buffer.push(a, 0);
  buffer.push(b, 100);
  const rendered = buffer.render(150)!;
  const x = rendered.npcs![0].x;
  assert(x > ARENA.width - 6 || x < 6);
  assert.notEqual(rendered.npcs![0], b.npcs![0]);
  life.close();
});

function workingVillage(dialogue: NpcDialogue = { generate: async () => ({ status: 'busy' }) }) {
  const world: NpcWorld = { players: createPlayers() };
  world.players.set('p', player('p', 2000, 2000));
  const life = new VillageLife(world, dialogue, 0, () => 0);
  for (const npc of world.npcs!) {
    const station = VILLAGE_DEFINITION.workstations.find((s) => s.npcId === npc.id)!;
    Object.assign(npc, station.worker);
  }
  life.tick(45_000, 0); // Arrive at each first workstation.
  life.tick(45_001, 0); // Publish the active work pose.
  return { world, life };
}

test('every resident works at two home stations, stays a full minute and alternates jobs', () => {
  const { world, life } = workingVillage();
  const stations = VILLAGE_DEFINITION.workstations;
  assert.equal(stations.length, 8);
  assert.equal(new Set(stations.map((s) => s.id)).size, 8);
  for (const npc of world.npcs!) {
    const own = stations.filter((s) => s.npcId === npc.id);
    assert.equal(own.length, 2);
    assert(own.every((s) => s.buildingId === npc.buildingId));
    const building = VILLAGE_DEFINITION.buildings.find((b) => b.id === npc.buildingId)!;
    assert(own.every((s) => Math.hypot(s.x - building.x, s.y - building.y) < 100));
    assert.equal(npc.workstationId, own[0].id);
    assert.equal(npc.moving, false);
    assert.deepEqual({ x: npc.x, y: npc.y }, own[0].worker);
  }
  life.tick(105_000, 59.999);
  assert(
    world.npcs!.every((n) => n.workstationId),
    'no job ends before 60 active seconds',
  );
  life.tick(105_001, 0.001);
  assert(world.npcs!.every((n) => !n.workstationId));
  for (const npc of world.npcs!) {
    const second = stations.filter((s) => s.npcId === npc.id)[1];
    Object.assign(npc, second.worker);
  }
  life.tick(150_000, 0);
  life.tick(150_001, 0);
  for (const npc of world.npcs!)
    assert.equal(npc.workstationId, stations.filter((s) => s.npcId === npc.id)[1].id);
  life.close();
});

test('workers return by walking before starting their job and never teleport home', () => {
  const { world, life } = workingVillage();
  const npc = world.npcs![0];
  life.tick(105_001, 60);
  Object.assign(npc, { x: 4700, y: 291 });
  const before = { x: npc.x, y: npc.y };
  life.tick(150_000, 0.05);
  assert(npc.moving);
  assert.equal(npc.workstationId, undefined);
  const distance = Math.hypot(npc.x - before.x, npc.y - before.y);
  assert(distance <= 38 * 0.05 + 0.001);
  assert(npc.x > before.x, 'uses the short wrapped route home');
  life.close();
});

test('trading and empty-village time suspend work without consuming its remaining minute', async () => {
  const { world, life } = workingVillage();
  const npc = world.npcs![0];
  const trader = world.players.get('p')!;
  life.tick(65_001, 20);
  const station = npc.workstationId;
  Object.assign(trader, { x: npc.x, y: npc.y - 15 });
  life.interact(trader, npc.id);
  assert.equal(npc.workstationId, undefined, 'interaction changes the pose immediately');
  life.tick(165_001, 100);
  await flush();
  assert.equal(npc.workstationId, undefined);
  life.interact(trader, null);
  trader.scene = 'forest';
  life.tick(265_001, 100);
  trader.scene = undefined;
  Object.assign(trader, { x: 2000, y: 2000 });
  life.tick(265_002, 0);
  assert.equal(npc.workstationId, station);
  life.tick(305_001, 39.999);
  assert.equal(npc.workstationId, station);
  life.tick(305_002, 0.001);
  assert.equal(npc.workstationId, undefined);
  life.close();
});

test('directed speech suspends work through reply delay, generation and visible speech, then resumes', async () => {
  let finish!: (result: DialogueResult) => void;
  const { world, life } = workingVillage({
    generate: () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  });
  const npc = world.npcs![0];
  const station = npc.workstationId;
  const speaker = world.players.get('p')!;
  Object.assign(speaker, { x: npc.x, y: npc.y - 15 });
  life.hear(speaker, '@Marta How is the cooking?', 45_002);
  assert.equal(npc.workstationId, undefined);
  life.tick(47_001, 1.999);
  assert.equal(npc.workstationId, undefined);
  life.tick(47_002, 0.001);
  life.tick(60_000, 12.998);
  assert.equal(npc.workstationId, undefined);
  finish({ status: 'ok', text: 'The soup is ready!' });
  await flush();
  Object.assign(speaker, { x: 2000, y: 2000 });
  life.tick(69_999, 9.999);
  assert.equal(npc.workstationId, undefined);
  life.tick(70_000, 0.001);
  assert.equal(npc.workstationId, station);
  life.tick(129_998, 59.998);
  assert.equal(npc.workstationId, station, 'conversation time did not consume the work session');
  life.close();
});

test('active work fields survive protocol projection and stay detached across pose changes', () => {
  const { world, life } = workingVillage();
  const state = new SessionState();
  const snapshot = { id: 'w', name: 'w', hostId: 'p', players: [], npcs: world.npcs };
  projectState(state, snapshot);
  const working = materializeState(state)!;
  const npc = world.npcs![0];
  assert.equal(working.npcs![0].workstationId, npc.workstationId);
  assert.equal(working.npcs![0].workStartedAt, npc.workStartedAt);
  Object.assign(world.players.get('p')!, { x: npc.x, y: npc.y - 15 });
  life.interact(world.players.get('p')!, npc.id);
  projectState(state, snapshot);
  assert.equal(materializeState(state)!.npcs![0].workstationId, undefined);
  assert(working.npcs![0].workstationId);
  life.close();
});
