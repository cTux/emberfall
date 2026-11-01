import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  TALENT_TREE,
  talentLearningState,
  canLearnTalent,
  talentRank,
} from '../packages/core/src/index.ts';
import { sameTalentProgress } from '../packages/client/src/talent-progress.ts';

test('batched talent views agree with authoritative eligibility across classes, levels and ranks', () => {
  for (const classId of ['warrior', 'ranger', 'mage', 'druid']) {
    for (const level of [1, 2, 20]) {
      for (const rank of [0, 1, 2, 99]) {
        const first = TALENT_TREE.find((node) => {
          return node.classId === classId;
        })!;
        const progress = { classId, level, talents: { [first.id]: rank, unknown: 99 } };
        const state = talentLearningState(progress);
        assert.equal(state.nodes.length, 30);

        for (const node of state.nodes) {
          assert.equal(node.available, canLearnTalent(progress, node.id));
          assert.equal(node.rank, talentRank(progress, node.id));
          assert.equal(node.learned, node.rank > 0);
        }
      }
    }
  }
});

test('batch construction scans the point budget once rather than once per learnable node', () => {
  let reads = 0;
  const talents = new Proxy<Record<string, number>>(
    {},
    {
      get(target, key: string) {
        reads++;

        return target[key];
      },
    },
  );
  talentLearningState({ classId: 'warrior', level: 20, talents });
  assert.ok(reads <= TALENT_TREE.length * 2, `Unexpected talent lookups: ${reads}`);
});

test('talent render comparison ignores detached identity but refreshes class, level and ranks', () => {
  const previous = { classId: 'warrior', level: 1, talents: { first: 1 } };
  assert.equal(sameTalentProgress(previous, structuredClone(previous)), true);

  for (const next of [
    { ...previous, classId: 'mage' },
    { ...previous, level: 2 },
    { ...previous, talents: { first: 2 } },
  ]) {
    assert.equal(sameTalentProgress(previous, next), false);
  }
});
