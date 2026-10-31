import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Player, ChatMessage } from '@emberfall/common';
import { nicknameSchema } from '@emberfall/common';
import { LOBBY_PORTAL, resourceNodes, gatherResource } from '@emberfall/core';
import { Parties } from './parties.ts';
import { sceneAction } from './scenes.ts';
const hero = (id: string): Player => ({
  id,
  name: id,
  x: LOBBY_PORTAL.x,
  y: LOBBY_PORTAL.y - 15,
  color: 0,
  level: 1,
  experience: 0,
  hitpoints: 100,
  maxHitpoints: 100,
  playtimeSeconds: 0,
});
function setup() {
  const players = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo'].map(hero);
  const world = { players: new Map(players.map((p) => [p.id, p])), chat: [] as ChatMessage[] };
  return { players, world, parties: new Parties(world) };
}
test('acceptance, leader routing, capacity and leadership transfer', () => {
  const {
    players: [a, b, c, d, e],
    parties,
    world,
  } = setup();
  assert.equal(a.partyId, undefined);
  parties.command(a, '/party @Bravo', 1000);
  assert.equal(a.partyId, undefined);
  parties.command(b, '/accept', 1100);
  assert.equal(a.partyId, b.partyId);
  assert.equal(b.partyLeaderId, a.id);
  parties.command(c, '/party @Bravo', 2000);
  assert.equal(parties.incoming(a, 2000)[0].fromId, c.id);
  parties.command(a, '/accept @Charlie', 2100);
  assert.throws(() => parties.request(b, d, 2200), /leader/);
  parties.request(a, d, 3000);
  parties.accept(d, a.id, 3100);
  assert.throws(() => parties.request(e, a, 4000), /full/);
  parties.leave(a);
  assert.equal(b.partyLeaderId, b.id);
  assert(world.chat.some((m) => m.recipientIds?.includes(b.id) && m.text.includes('accepted')));
});
test('expiry, stale requests, remote interaction and ambiguous acceptance', () => {
  const {
    players: [a, b, c],
    parties,
  } = setup();
  parties.request(a, b, 1000);
  parties.request(c, b, 1000);
  assert.throws(() => parties.accept(b, undefined, 1100), /Specify/);
  parties.accept(b, a.id, 1200);
  assert.equal(parties.incoming(b, 1300).length, 0);
  parties.request(c, a, 2000);
  assert.equal(parties.incoming(a, 33000).length, 0);
  c.x += 1000;
  assert.throws(() => parties.interact(c, a.id, 34000), /closer/);
});
test('independent runs, party voting, late join and dissolution preserve dimensions', () => {
  const {
    players: [a, b, c],
    parties,
  } = setup();
  const solo = parties.run(c);
  sceneAction(solo, c, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 0);
  const run = parties.run(a);
  sceneAction(run, a, { type: 'createScene', scene: 'Forest', difficulty: 'Hard' }, 0);
  assert.notEqual(run.scene!.id, solo.scene!.id);
  parties.request(a, b, 1000);
  parties.accept(b, a.id, 1100);
  assert.equal(parties.run(b), run);
  sceneAction(run, a, { type: 'ready', ready: true }, 1200);
  assert.equal(run.scene!.phase, 'voting');
  sceneAction(run, b, { type: 'ready', ready: true }, 1200);
  parties.tick(7000, 0);
  assert.equal(a.scene, 'forest');
  assert.equal(b.scene, 'forest');
  assert.equal(c.scene, undefined);
  parties.request(c, a, 8000);
  parties.accept(a, c.id, 8100);
  assert.equal(c.scene, undefined);
  assert.equal(parties.run(c), run);
  parties.leave(c);
  parties.leave(a);
  assert.equal(b.partyId, undefined);
  assert.equal(parties.run(b), run);
  assert.notEqual(parties.run(a), run);
  assert.equal(b.scene, 'forest');
  assert.equal(a.scene, undefined);
});
test('nicknames enforce ASCII format and length', () => {
  for (const name of ['Ab3', 'a_b', 'Abc123456789']) assert(nicknameSchema.safeParse(name).success);
  for (const name of ['ab', 'abcdefghijklm', 'Game Hero', ' Hero', 'abc!'])
    assert(!nicknameSchema.safeParse(name).success);
});

test('accepting another invitation invalidates an old party invitation without switching parties', () => {
  const {
    players: [a, b, c, d],
    parties,
  } = setup();
  parties.request(a, b, 1000);
  parties.accept(b, a.id, 1100);
  parties.request(a, c, 2000);
  parties.request(d, c, 2000);
  parties.accept(c, d.id, 2100);
  assert.throws(() => parties.accept(c, a.id, 2200), /Specify/);
  assert.equal(c.partyId, d.partyId);
  assert.notEqual(c.partyId, a.partyId);
});
test('forest members of another run still block the party vote until they return and ready', () => {
  const {
    players: [a, b],
    parties,
  } = setup();
  const old = parties.run(b);
  sceneAction(old, b, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 0);
  sceneAction(old, b, { type: 'ready', ready: true }, 0);
  parties.tick(5000, 0);
  assert.equal(b.scene, 'forest');
  parties.request(a, b, 6000);
  parties.accept(b, a.id, 6100);
  const run = parties.run(a);
  sceneAction(run, a, { type: 'createScene', scene: 'Forest', difficulty: 'Easy' }, 6200);
  sceneAction(run, a, { type: 'ready', ready: true }, 6200);
  parties.tick(12000, 0);
  assert.equal(run.scene!.phase, 'voting');
  assert(!run.players.has(b.id));
  sceneAction(old, b, { type: 'leaveScene' }, 12100);
  parties.run(b);
  sceneAction(run, b, { type: 'ready', ready: true }, 12200);
  parties.tick(18000, 0);
  assert.equal(b.runId, a.runId);
  assert.equal(b.scene, 'forest');
});
test('forest depletion belongs to each run', () => {
  const {
    players: [a, b],
    parties,
  } = setup();
  a.scene = 'forest';
  b.scene = 'forest';
  a.x = b.x = 1;
  a.y = b.y = 1;
  const first = parties.run(a);
  const second = parties.run(b);
  const tree = resourceNodes(a, 250).find((n) => n.kind === 'tree')!;
  a.x = b.x = tree.x;
  a.y = b.y = tree.y - 15;
  gatherResource(a, (first.resources ??= {}), tree.id, 1000, () => 0);
  assert.equal(first.resources[tree.id].remaining, 4);
  assert.equal(second.resources?.[tree.id], undefined);
  gatherResource(b, (second.resources ??= {}), tree.id, 1000, () => 0);
  assert.equal(second.resources[tree.id].remaining, 4);
  assert.equal(first.resources[tree.id].remaining, 4);
});
