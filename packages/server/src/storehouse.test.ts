import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BUILDINGS,
  clientMessage,
  freshStorages,
  storagesSchema,
  transferStoredItem,
  type Player,
  type ServerMessage,
} from '@emberfall/common';
import { CharacterStore, decodeProgress, freshProgress } from './characters.ts';
import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';

const item = (itemId = 'loot-helmet', quantity = 1) => ({
  id: crypto.randomUUID(),
  itemId,
  quantity,
});
const hero = (): Player => ({
  ...freshProgress('warrior'),
  id: 'p',
  name: 'Hero',
  x: 0,
  y: 0,
  color: 0,
});

test('three bounded storages transfer whole stacks, conserve items and reject stale/full destinations', () => {
  const player = hero();
  player.backpack = [item('health-potion', 5)];
  const id = player.backpack[0].id;
  transferStoredItem(player, 2, id, true);
  assert.equal(player.backpack.length, 0);
  assert.equal(player.storages![2].items[0].quantity, 5);
  assert.throws(() => transferStoredItem(player, 2, id, true), /available/);
  player.backpack = Array.from({ length: 20 }, () => item());
  const before = structuredClone(player);
  assert.throws(() => transferStoredItem(player, 2, id, false), /full/);
  assert.deepEqual(player, before);
  player.backpack = [item('health-potion', 3)];
  player.storages![2].items.push(...Array.from({ length: 39 }, () => item()));
  transferStoredItem(player, 2, player.backpack[0].id, true);
  assert.equal(player.storages![2].items.length, 40);
  assert.equal(player.storages![2].items[0].quantity, 8);
  player.backpack = [item()];
  assert.throws(() => transferStoredItem(player, 2, player.backpack![0].id, true), /full/);
  assert.equal(player.backpack.length, 1);
  player.backpack = Array.from({ length: 19 }, () => item());
  player.backpack.push(item('health-potion', 2));
  transferStoredItem(player, 2, id, false);
  assert.equal(player.backpack.length, 20);
  assert.equal(player.backpack.at(-1)!.quantity, 10);
  assert.equal(player.storages![2].items.length, 39);
});

test('storage schemas bound tabs, slots, names and identities; legacy progress gets empty storages', () => {
  for (const tab of [-1, 3, 0.5]) {
    assert.equal(
      clientMessage.safeParse({ type: 'storeItem', tab, id: 'x', depositing: true }).success,
      false,
    );
    assert.equal(
      clientMessage.safeParse({ type: 'renameStorage', tab, name: 'Gear' }).success,
      false,
    );
  }
  for (const name of ['', '  ', 'a'.repeat(25), 'bad\nname', 'bad\u200bname'])
    assert.equal(clientMessage.safeParse({ type: 'renameStorage', tab: 0, name }).success, false);
  const rename = clientMessage.parse({ type: 'renameStorage', tab: 0, name: ' Gear ' });
  assert.equal(rename.type === 'renameStorage' && rename.name, 'Gear');
  assert.equal(storagesSchema.safeParse(freshStorages().slice(1)).success, false);
  const storages = freshStorages();
  storages[0].items = Array.from({ length: 41 }, () => item());
  assert.equal(storagesSchema.safeParse(storages).success, false);
  storages[0].items = [item()];
  storages[1].items = [...storages[0].items];
  assert.equal(storagesSchema.safeParse(storages).success, false);
  const legacy = { ...freshProgress(), storages: undefined };
  assert.deepEqual(decodeProgress(JSON.stringify(legacy)).progress.storages, freshStorages());
});

test('storage survives restart and class changes without sharing between characters or classes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'emberfall-storage-'));
  const path = join(directory, 'characters.sqlite');
  let store = new CharacterStore(path);
  try {
    await store.ready;
    const saved = store.create('Keeper');
    const player = { ...hero(), ...saved.progress, classId: saved.classId, classes: saved.classes };
    player.storages![1].name = 'Armor';
    player.backpack = [item()];
    transferStoredItem(player, 1, player.backpack[0].id, true);
    store.save(saved.id, player.name, player);
    store.selectClass(saved.id, player, 'mage');
    assert.deepEqual(player.storages, freshStorages());
    store.selectClass(saved.id, player, 'warrior');
    assert.equal(player.storages![1].items.length, 1);
    const other = store.create('Other');
    assert.deepEqual(other.progress.storages, freshStorages());
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    const restored = store.load(saved.token)!;
    assert.equal(restored.progress.storages![1].name, 'Armor');
    assert.equal(restored.progress.storages![1].items.length, 1);
    assert.equal(restored.progress.backpack!.length, 0);
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('session commands require Storehouse proximity and commit before publishing, including renames', async (t) => {
  const runtime = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: 'join', worldId: world.id, playerName: 'Keeper', password: '' });
    for (let i = 0; i < 200 && !world.players.size; i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    const player = [...world.players.values()][0];
    player.backpack = [item()];
    const command = { type: 'storeItem', tab: 0, id: player.backpack[0].id, depositing: true };
    const error = () => (messages.at(-1) as { message: string }).message;
    peer.receive(command);
    assert.match(error(), /Storehouse/);
    const building = BUILDINGS.find((building) => building.id === 'storehouse')!;
    player.x = building.doorX;
    player.y = building.y + 9;
    player.scene = 'forest';
    peer.receive(command);
    assert.match(error(), /Storehouse/);
    delete player.scene;
    player.hitpoints = 0;
    peer.receive(command);
    assert.match(error(), /living/);
    player.hitpoints = player.maxHitpoints;
    const before = structuredClone(player);
    const failedSave = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('Test save failure');
    });
    peer.receive(command);
    assert.match(error(), /Unable to save/);
    assert.deepEqual(player, before);
    peer.receive({ type: 'renameStorage', tab: 0, name: 'Gear' });
    assert.deepEqual(player, before);
    failedSave.mock.restore();
    peer.receive(command);
    assert.equal(player.backpack.length, 0);
    assert.equal(player.storages![0].items.length, 1);
    peer.receive(command);
    assert.match(error(), /available/);
    peer.receive({ type: 'renameStorage', tab: 0, name: ' Gear ' });
    assert.equal(player.storages![0].name, 'Gear');
  } finally {
    await runtime.close();
  }
});
