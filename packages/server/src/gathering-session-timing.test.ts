import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player, ResourceState } from '@emberfall/common';
import { SessionState, projectState, materializeState } from '@emberfall/common/protocol';
import {
  VILLAGE_RESOURCES,
  startGathering,
  tickGathering,
  startTimedActivity,
  checkTimedActivity,
  activityIndicator,
  ACTIVITY_SWEEP_MS,
} from '@emberfall/core';
import { decodeProgress } from './characters.ts';
import { hero, item } from './gathering.fixture.ts';

test('session gathering validates the area epoch and owns rewards independently of wire fields', async () => {
  const { createRuntime } = await import('./runtime.ts');
  const { Peer } = await import('./network/peer.ts');
  const runtime = await createRuntime();
  const peer = new Peer(
    () => {},
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Gatherer', password: '' });

    for (let i = 0; i < 200 && !world.players.size; i++) {
      await new Promise((resolve) => {
        return setTimeout(resolve, 10);
      });
    }

    const player = [...world.players.values()][0];
    assert(player);
    const rock = VILLAGE_RESOURCES.find((n) => {
      return n.kind === 'rock';
    })!;
    Object.assign(player, { x: rock.x, y: rock.y - 15 });
    peer.receive({ type: 'gather', nodeId: rock.id, epoch: 'old-forest' });
    assert.equal(world.resources?.[rock.id], undefined);
    peer.receive({ type: 'gather', nodeId: rock.id, epoch: 'lobby', quantity: 200, itemId: 'log' });
    assert.equal(world.resources?.[rock.id], undefined);
    assert.equal(player.backpack!.length, 0);
    assert(player.gathering);
    const start = player.gathering.startedAt;
    peer.receive({ type: 'gather', nodeId: rock.id, epoch: 'lobby' });
    assert.equal(player.gathering.startedAt, start, 'repeated starts do not reset the clock');
    tickGathering(player, (world.resources ??= {}), 'lobby', start + 4999);
    assert.equal(world.resources?.[rock.id], undefined);
    tickGathering(player, world.resources, 'lobby', start + 5000);
    assert.equal(world.resources?.[rock.id].remaining, 0);
    assert.deepEqual(
      player.backpack!.map(({ itemId, quantity }) => {
        return { itemId, quantity };
      }),
      [{ itemId: 'rock', quantity: 1 }],
    );
    peer.receive({ type: 'gather', nodeId: rock.id, epoch: 'lobby' });
    assert.equal(player.backpack![0].quantity, 1);
  } finally {
    await runtime.close();
  }
});

test('timed checks save two seconds, replace one zone and reject misses, stale IDs and invalid times', () => {
  const activity = startTimedActivity(1000, 5000, () => {
    return 0.5;
  });
  assert.equal(activity.endsAt, 6000);
  assert.equal(activityIndicator(activity, 1000 + ACTIVITY_SWEEP_MS), 1);
  assert.equal(activityIndicator(activity, 1000 + 2 * ACTIVITY_SWEEP_MS), 0);
  const at = 1000 + (activity.zoneStart + 0.07) * ACTIVITY_SWEEP_MS;
  const id = activity.checkId;
  assert(!checkTimedActivity(activity, id, 1000, 1000));
  assert(!checkTimedActivity(activity, id, at, at - 1));
  assert(!checkTimedActivity(activity, id, at, at + 501));
  assert(!checkTimedActivity(activity, 'forged', at, at));
  assert(
    checkTimedActivity(activity, id, at, at, () => {
      return 0.5;
    }),
  );
  assert.equal(activity.endsAt, 4000);
  assert.notEqual(activity.checkId, id);
  assert(!checkTimedActivity(activity, id, at, at));
  assert(!checkTimedActivity(activity, activity.checkId, at, at));
  const nextAt = 1000 + (2 - activity.zoneStart - 0.07) * ACTIVITY_SWEEP_MS;
  assert(checkTimedActivity(activity, activity.checkId, nextAt, nextAt));
  assert.equal(activity.endsAt, 2000);
});

test('a successful check can finish gathering immediately and cannot award twice', () => {
  const node = VILLAGE_RESOURCES.find((n) => {
    return n.kind === 'plant';
  })!;
  const player = hero(node);
  const states: Record<string, ResourceState> = {};
  startGathering(player, states, node.id, 'lobby', 1000);
  const activity = player.gathering!;
  activity.zoneStart = 0.5;
  activity.endsAt = 2800;
  assert(checkTimedActivity(activity, activity.checkId, 1680, 1680));
  tickGathering(player, states, 'lobby', 1680);
  assert.equal(player.gathering, undefined);
  assert.equal(states[node.id].remaining, 0);
  assert.equal(player.backpack![0].quantity, 1);
  tickGathering(player, states, 'lobby', 1680);
  assert.equal(player.backpack![0].quantity, 1);
});

test('gathering cancels on range, death, disconnect, area change and competing depletion; inventory failure is atomic', () => {
  const node = VILLAGE_RESOURCES.find((n) => {
    return n.kind === 'rock';
  })!;

  for (const cancel of [
    (p: Player) => {
      p.x += 100;
    },
    (p: Player) => {
      p.hitpoints = 0;
    },
    (p: Player) => {
      p.reconnecting = true;
    },
    (p: Player) => {
      p.gathering!.epoch = 'old';
    },
  ]) {
    const player = hero(node);
    const states: Record<string, ResourceState> = {};
    startGathering(player, states, node.id, 'lobby', 1000);
    cancel(player);
    tickGathering(player, states, 'lobby', 6000);
    assert.equal(player.gathering, undefined);
    assert.deepEqual(player.backpack, []);
    assert.deepEqual(states, {});
  }

  const states: Record<string, ResourceState> = {};
  const a = hero(node),
    b = hero(node);
  startGathering(a, states, node.id, 'lobby', 1000);
  startGathering(b, states, node.id, 'lobby', 1000);
  tickGathering(a, states, 'lobby', 6000);
  tickGathering(b, states, 'lobby', 6000);
  assert.equal(a.backpack![0].quantity, 1);
  assert.deepEqual(b.backpack, []);
  assert.equal(b.gathering, undefined);
  const full = hero(node);
  full.backpack = Array.from({ length: 20 }, () => {
    return item('warrior-sword');
  });
  startGathering(full, {}, node.id, 'lobby', 1000);
  assert.throws(() => {
    return tickGathering(full, {}, 'lobby', 6000);
  }, /full/);
  assert.equal(full.gathering, undefined);
  assert.equal(full.backpack.length, 20);
  startGathering(a, {}, node.id, 'lobby', 7000);
  assert(!('gathering' in decodeProgress(JSON.stringify(a)).progress));
  const wire = new SessionState();
  projectState(wire, { id: 'w', name: 'w', hostId: a.id, players: [a] });
  assert.deepEqual(materializeState(wire)?.players[0].gathering, a.gathering);
});
