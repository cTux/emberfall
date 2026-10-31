import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ServerMessage, WorldState } from '@emberfall/common';
import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';
const flush = () => {
  return new Promise<void>((resolve) => {
    return setImmediate(resolve);
  });
};

test('server filters NPC speech and silence announcements by dimension while player chat stays world-wide', async () => {
  const app = await createRuntime(':memory:', {
    generate: async () => {
      return { status: 'busy' };
    },
  });
  const peers: Peer[] = [];

  function connect() {
    let world: WorldState | undefined;
    const peer = new Peer(
      (message: ServerMessage) => {
        if (message.type === 'joined' || message.type === 'state') {
          world = structuredClone(message.world);
        }
      },
      () => {},
    );
    peers.push(peer);
    app.connect(peer);

    return {
      peer,
      get world() {
        return world;
      },
    };
  }

  try {
    const a = connect(),
      b = connect(),
      c = connect();
    a.peer.receive({ type: 'create', name: 'Village', playerName: 'Alice', password: '' });
    c.peer.receive({ type: 'create', name: 'Elsewhere', playerName: 'Other', password: '' });
    await flush();
    b.peer.receive({ type: 'join', worldId: a.world!.id, playerName: 'Bob', password: '' });
    await flush();
    const world = app.worlds.get(a.world!.id)!;
    world.players.get(
      b.world!.players.find((p) => {
        return p.name === 'Bob';
      })!.id,
    )!.scene = 'forest';
    world.chat = [
      {
        id: 'npc',
        playerId: '',
        name: 'Marta',
        text: 'Welcome!',
        npcId: 'innkeeper',
        dimension: 'village',
      },
      {
        id: 'silence',
        playerId: '',
        name: 'System',
        text: 'Silenced',
        tone: 'danger',
        dimension: 'village',
      },
    ];
    a.peer.receive({ type: 'chat', text: 'Hello world' });
    await flush();
    assert(
      a.world!.chat!.some((m) => {
        return m.id === 'npc';
      }),
    );
    assert(
      a.world!.chat!.some((m) => {
        return m.id === 'silence';
      }),
    );
    assert(
      !b.world!.chat!.some((m) => {
        return m.dimension === 'village';
      }),
    );
    assert(
      b.world!.chat!.some((m) => {
        return m.text === 'Hello world';
      }),
    );
    assert(
      !c.world!.chat!.some((m) => {
        return m.id === 'npc';
      }),
    );
    // Entering the village receives its retained messages on the next update.
    world.players.get(
      b.world!.players.find((p) => {
        return p.name === 'Bob';
      })!.id,
    )!.scene = undefined;
    b.peer.receive({ type: 'chat', text: 'Back in village' });
    await flush();
    assert(
      b.world!.chat!.some((m) => {
        return m.id === 'npc';
      }),
    );
  } finally {
    await app.close();
  }
});
