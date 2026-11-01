import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ResourceState } from '@emberfall/common';
import { dimensionDefinition, resourceNodes, gatherResource, FOREST, game } from '@emberfall/core';
import { hero } from './gathering.fixture.ts';
import { decodeProgress } from './characters.ts';

for (const dimension of ['swamp', 'desert'] as const) {
  test(`${dimension}: every resource yields its own saved item, wraps and rejects foreign nodes`, () => {
    const player = hero();
    Object.assign(player, { x: 1, y: 1, scene: 'forest', dimension });
    const resources = resourceNodes(player, 250);
    const states: Record<string, ResourceState> = {};

    for (const kind of ['tree', 'plant', 'rock', 'stone'] as const) {
      const node = resources.find((node) => {
        return node.kind === kind;
      })!;
      assert.ok(node);
      player.x = node.x + FOREST.width;
      player.y = node.y - 15 + FOREST.height;
      const itemId = dimensionDefinition(dimension).resources[kind];
      assert.deepEqual(gatherResource(player, states, node.id, 1000), [itemId]);
      assert.equal(states[node.id].remaining, kind === 'tree' ? 4 : 0);
      assert.equal(game.rules.itemDefinition(itemId).kind, 'resource');
      assert.equal(
        decodeProgress(JSON.stringify(player)).progress.backpack!.at(-1)!.itemId,
        itemId,
      );
      const otherId = node.id.replace(
        `${dimension}:`,
        `${dimension === 'swamp' ? 'desert' : 'swamp'}:`,
      );
      const before = JSON.stringify({ backpack: player.backpack, states });
      assert.throws(() => {
        gatherResource(player, states, otherId, 1000);
      }, /closer/);
      assert.equal(JSON.stringify({ backpack: player.backpack, states }), before);
    }
  });
}
