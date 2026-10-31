import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ResourceState } from '@emberfall/common';

import {
  VILLAGE_RESOURCES,
  resourceNodes,
  gatherResource,
  restoreResources,
  RESOURCE_RESTORE_MS,
  GATHER_RANGE,
  clientMessage,
  FOREST,
  PLANT_KINDS,
} from '@emberfall/core';
import { decodeProgress } from './characters.ts';
import { hero } from './gathering.fixture.ts';

test('each tree allows five independent rolls, shows remaining health and restores after one hour', () => {
  const node = VILLAGE_RESOURCES.find((n) => n.kind === 'tree')!;
  const player = hero(node);
  const states: Record<string, ResourceState> = {};
  for (let i = 0; i < 5; i++) {
    const rolls = [0.79999, 0.39999, 0.19999];
    assert.deepEqual(
      gatherResource(player, states, node.id, 1000 + i * 400, () => rolls.shift()!),
      ['log', 'stick', 'leaf'],
    );
    assert.equal(states[node.id].remaining, 4 - i);
  }

  assert.deepEqual(
    player.backpack!.map((i) => i.quantity),
    [5, 5, 5],
  );
  assert.throws(() => gatherResource(player, states, node.id, 4000), /restoring/);
  const deadline = 2600 + RESOURCE_RESTORE_MS;
  restoreResources(states, deadline - 1);
  assert.equal(states[node.id].remaining, 0);
  restoreResources(states, deadline);
  assert.equal(states[node.id], undefined);
  const rolls = [0.8, 0.4, 0.2];
  assert.deepEqual(
    gatherResource(player, states, node.id, deadline, () => rolls.shift()!),
    [],
  );
  assert.equal(states[node.id].remaining, 4);
  restoreResources(states, deadline + RESOURCE_RESTORE_MS);
  assert.equal(states[node.id], undefined, 'abandoned partial trees restore too');
});

test('plants, rocks and stones grant one matching item and depletion is shared across players', () => {
  const nodes = [
    ...PLANT_KINDS.map((_, variant) =>
      VILLAGE_RESOURCES.find((n) => n.kind === 'plant' && n.variant === variant)!,
    ),
    ...(['rock', 'stone'] as const).map((kind) => VILLAGE_RESOURCES.find((n) => n.kind === kind)!),
  ];
  for (const node of nodes) {
    const states: Record<string, ResourceState> = {};
    const player = hero(node);
    assert.deepEqual(gatherResource(player, states, node.id, 1000), [
      node.kind === 'plant' ? PLANT_KINDS[node.variant!] : node.kind,
    ]);
    assert.equal(player.backpack![0].quantity, 1);
    assert.deepEqual(decodeProgress(JSON.stringify(player)).progress.backpack, player.backpack);
    assert.throws(() => gatherResource(hero(node), states, node.id, 1000), /restoring/);
    gatherResource(player, states, node.id, 1000 + RESOURCE_RESTORE_MS);
    assert.equal(player.backpack![0].quantity, 2);
  }
});

test('gathering rejects dead, distant and forged requests without mutation; wrapped forest nodes have no cooldown', () => {
  const node = VILLAGE_RESOURCES[0];
  const player = hero(node);
  const states: Record<string, ResourceState> = {};
  assert.throws(() => gatherResource(player, states, 'forged', 1000), /closer/);
  player.hitpoints = 0;
  assert.throws(() => gatherResource(player, states, node.id, 1000), /dead/);
  player.hitpoints = 100;
  player.x += GATHER_RANGE + 1;
  assert.throws(() => gatherResource(player, states, node.id, 1000), /closer/);
  assert.deepEqual(states, {});
  Object.assign(player, { x: 1, y: 1, scene: 'forest' });
  const tree = resourceNodes(player, 250).find((n) => n.kind === 'tree')!;
  Object.assign(player, { x: tree.x + FOREST.width, y: tree.y - 15 + FOREST.height });
  gatherResource(player, states, tree.id, 1000, () => 0);
  gatherResource(player, states, tree.id, 1000, () => 0);
  assert.equal(states[tree.id].remaining, 3);
  assert(clientMessage.safeParse({ type: 'gather', nodeId: tree.id, epoch: 'area' }).success);
  assert(!clientMessage.safeParse({ type: 'gather', nodeId: tree.id }).success);
});
