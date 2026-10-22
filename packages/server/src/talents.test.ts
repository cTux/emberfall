import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import test from 'node:test';
import type { Player, SceneState } from '@emberfall/common';
import { clientMessage } from '@emberfall/common';
import {
  TALENT_TREE,
  availableTalentPoints,
  canLearnTalent,
  isTalentLearned,
  learnTalent,
  characterStats,
  castTalentAbility,
  talentAbility,
  talentCooldownMs,
  tickPlayerShots,
  TRAINING_ZONES,
  starterEquipment,
} from '@emberfall/core';
import { CharacterStore, freshProgress } from './characters.ts';
const hero = (classId = 'warrior'): Player => ({
  ...freshProgress(classId),
  id: 'a',
  name: 'Hero',
  classId,
  level: 20,
  x: 4790,
  y: 1280,
  color: 0,
  equipment: starterEquipment(classId),
});
const arena = (training = false): SceneState => ({
  id: 'test',
  type: 'Forest',
  difficulty: 'Easy',
  phase: 'active',
  ready: [],
  countdownAt: null,
  endsAt: 1e9,
  nextSpawn: 1e9,
  sequence: 0,
  enemies: [],
  damage: [],
  portals: [],
  training,
});
function learnPath(player: Player, slot: number) {
  for (let step = 1; step <= 4; step++) learnTalent(player, `path-${slot}-${step}`);
}

test('points, prerequisites, duplicate requests and independent branches', () => {
  const p = hero();
  p.level = 1;
  assert.equal(availableTalentPoints(p), 0);
  assert.equal(isTalentLearned(p, 'center'), true);
  assert.throws(() => learnTalent(p, 'center'));
  assert.throws(() => learnTalent(p, 'unknown'));
  assert.throws(() => learnTalent(p, 'path-0-1'));
  p.level = 3;
  assert.throws(() => learnTalent(p, 'path-0-2'));
  learnTalent(p, 'path-0-1');
  assert.equal(availableTalentPoints(p), 1);
  assert.equal(canLearnTalent(p, 'path-0-2'), true);
  assert.equal(canLearnTalent(p, 'path-1-1'), true);
  assert.throws(() => learnTalent(p, 'path-0-1'));
  learnTalent(p, 'path-0-2');
  assert.equal(canLearnTalent(p, 'path-0-3'), false);
  p.paragon = 100;
  assert.equal(availableTalentPoints(p), 0);
  for (const node of TALENT_TREE)
    for (const child of node.next)
      assert.equal(TALENT_TREE.find((n) => n.id === child)?.previous, node.id);
  assert.equal(
    clientMessage.safeParse({ type: 'talentCast', slot: 4, classId: 'warrior', epoch: 'lobby' })
      .success,
    false,
  );
});

test('learned paths apply all four stat types and ignore legacy reserved data', () => {
  const p = hero();
  const before = characterStats(p);
  p.talents = { strength: 99, 'path-0-4': 1 };
  assert.equal(characterStats(p).power, before.power);
  assert.equal(availableTalentPoints(p), 19);
  p.talents = {};
  for (let slot = 0; slot < 4; slot++) learnPath(p, slot);
  const after = characterStats(p);
  assert.equal(after.power, before.power + 3);
  assert(Math.abs(after.attacksPerSecond - before.attacksPerSecond * 1.3) < 1e-9);
  assert(Math.abs(after.criticalChance - before.criticalChance - 0.15) < 1e-9);
  assert(Math.abs(after.criticalMultiplier - before.criticalMultiplier - 0.3) < 1e-9);
});

test('each class and slot casts its own learned ability with cooldown and authoritative restrictions in forest/training', (t) => {
  t.mock.method(Math, 'random', () => 0.99);
  for (const classId of ['warrior', 'ranger', 'mage', 'druid'])
    for (let slot = 0; slot < 4; slot++)
      for (const training of [false, true]) {
        const p = hero(classId);
        const scene = arena(training);
        if (training) {
          p.x = TRAINING_ZONES[0].x;
          p.y = TRAINING_ZONES[0].y;
        } else p.scene = 'forest';
        scene.enemies = [
          { id: 1, x: training ? p.x + 40 : 10, y: p.y, hitpoints: 10000, angle: 0 },
        ];
        const request = { slot, classId, epoch: training ? 'lobby' : scene.id };
        assert.equal(castTalentAbility(scene, p, request, 1000), false);
        learnPath(p, slot);
        assert.equal(castTalentAbility(scene, p, { ...request, classId: 'fake' }, 1000), false);
        assert.equal(castTalentAbility(scene, p, { ...request, epoch: 'stale' }, 1000), false);
        assert.equal(
          castTalentAbility(scene, p, request, 1000),
          true,
          `${classId}/${slot}/${training}`,
        );
        assert.equal(castTalentAbility(scene, p, request, 1001), false);
        const ability = talentAbility(p, slot)!;
        assert.equal(p.talentCooldowns![ability.id], 1000 + talentCooldownMs(p, slot));
        if (classId !== 'warrior') {
          assert(scene.playerShots!.every((shot) => shot.abilityId === ability.id));
          tickPlayerShots(scene, [p], 1100, 0.2);
        }
        assert(scene.damage.length > 0, `${classId}/${slot} must cause real damage`);
        if (training) {
          assert.equal(p.experience, 0);
          assert.equal(scene.drops?.length ?? 0, 0);
        }
        p.hitpoints = 0;
        assert.equal(castTalentAbility(scene, p, request, 100000), false);
      }
});

test('allocations round trip per class without leaking across class changes', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'emberfall-talents-'));
  const path = join(directory, 'save.sqlite');
  let store = new CharacterStore(path);
  await store.ready;
  try {
    const saved = store.create('Hero');
    const p = { ...hero(), ...saved.progress, classes: saved.classes };
    p.level = 10;
    learnPath(p, 0);
    store.save(saved.id, p.name, p);
    store.selectClass(saved.id, p, 'mage');
    assert.equal(availableTalentPoints(p), 0);
    assert.deepEqual(p.talents, {});
    p.level = 6;
    learnPath(p, 1);
    store.selectClass(saved.id, p, 'warrior');
    assert.equal(isTalentLearned(p, 'path-0-4'), true);
    assert.equal(isTalentLearned(p, 'path-1-4'), false);
    store.selectClass(saved.id, p, 'mage');
    assert.equal(isTalentLearned(p, 'path-1-4'), true);
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    const restored = store.load(saved.token);
    assert.equal(isTalentLearned(restored.classes.warrior, 'path-0-4'), true);
    assert.equal(isTalentLearned(restored.classes.mage, 'path-1-4'), true);
    assert.equal(availableTalentPoints(restored.progress), 1);
  } finally {
    store.close();
    rmSync(directory, { recursive: true });
  }
});

test('learning command rejects duplicate/locked nodes and publishes only after saving', async (t) => {
  const { createRuntime } = await import('./runtime.ts');
  const { Peer } = await import('./network/peer.ts');
  const runtime = await createRuntime();
  const messages: { type: string; message?: string }[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Talented', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    const p = [...world.players.values()][0];
    p.level = 3;
    peer.receive({ type: 'learnTalent', nodeId: 'path-0-2' });
    assert.equal(availableTalentPoints(p), 2);
    const fail = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('failed save');
    });
    peer.receive({ type: 'learnTalent', nodeId: 'path-0-1' });
    assert.match(messages.at(-1)!.message!, /Unable to save/);
    assert.equal(isTalentLearned(p, 'path-0-1'), false);
    fail.mock.restore();
    peer.receive({
      type: 'learnTalent',
      nodeId: 'path-0-1',
      talents: { 'path-0-4': 1 },
      level: 20,
    });
    peer.receive({ type: 'learnTalent', nodeId: 'path-0-1' });
    assert.equal(availableTalentPoints(p), 1);
    assert.equal(p.level, 3);
    assert.equal(isTalentLearned(p, 'path-0-4'), false);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});
