import assert from 'node:assert/strict';
import test from 'node:test';

import {
  TALENT_TREE,
  TALENT_LEVELS,
  talentNodeId,
  talentRank,
  availableTalentPoints,
  canLearnTalent,
  learnTalent,
  normalizeTalents,
  characterStats,
} from '@emberfall/core';

import { hero, ability } from './talents.fixture.ts';

test('all classes have thirty independent talents and twelve abilities, with a defensive third column', () => {
  assert.equal(TALENT_TREE.length, 120);
  for (const classId of ['warrior', 'ranger', 'mage', 'druid']) {
    const nodes = TALENT_TREE.filter((node) => node.classId === classId);
    assert.equal(nodes.length, 30);
    assert.equal(nodes.filter((node) => node.kind === 'ability').length, 12);
    assert.deepEqual(
      nodes.filter((node) => node.column === 0).map((node) => node.level),
      TALENT_LEVELS,
    );
  }
});

test('one starting point, two ranks, level-only gates, no stat bonuses and no paragon points', () => {
  const player = hero();
  player.level = 1;
  assert.equal(availableTalentPoints(player), 1);
  const first = talentNodeId('warrior', 0, 0),
    high = talentNodeId('warrior', 2, 9);
  assert.equal(canLearnTalent(player, high), false);
  learnTalent(player, first);
  assert.equal(availableTalentPoints(player), 0);
  assert.throws(() => learnTalent(player, first));
  player.level = 2;
  learnTalent(player, first);
  assert.equal(talentRank(player, first), 2);
  assert.throws(() => learnTalent(player, first));
  player.level = 20;
  player.paragon = 999;
  learnTalent(player, high);
  assert.equal(availableTalentPoints(player), 17);
  assert.throws(() => learnTalent(player, talentNodeId('mage', 0, 0)));
  const learned = characterStats(player);
  assert.deepEqual(learned, characterStats({ ...player, talents: {} }));
});

test('a whole column costs exactly twenty points; mixing columns and inactive extensions is allowed', () => {
  for (const classId of ['warrior', 'ranger', 'mage', 'druid']) {
    const player = hero(classId);
    for (let row = 0; row < 10; row++)
      for (let n = 0; n < 2; n++) learnTalent(player, talentNodeId(classId, 0, row));
    assert.equal(availableTalentPoints(player), 0);
    assert.throws(() => learnTalent(player, talentNodeId(classId, 1, 0)));
  }

  const player = hero();
  learnTalent(player, talentNodeId('warrior', 0, 6));
  learnTalent(player, talentNodeId('warrior', 2, 8));
  assert.equal(availableTalentPoints(player), 18);
});

test('migration refunds old allocations once and repairs wrong-class, overbudget and locked ranks', () => {
  const player = hero();
  player.talentVersion = undefined;
  player.talents = { 'path-0-1': 1, strength: 99 };
  normalizeTalents(player, 'warrior');
  assert.deepEqual(player.talents, {});
  assert.equal(availableTalentPoints(player), 20);
  ability(player, 1, 1, 2);
  const snapshot = structuredClone(player);
  normalizeTalents(player, 'warrior');
  assert.deepEqual(player, snapshot);
  player.talents[talentNodeId('mage', 0, 0)] = 1;
  normalizeTalents(player, 'warrior');
  assert.deepEqual(player.talents, {});
  player.level = 1;
  player.talents = { [talentNodeId('warrior', 0, 9)]: 2 };
  normalizeTalents(player, 'warrior');
  assert.equal(availableTalentPoints(player), 1);
});
