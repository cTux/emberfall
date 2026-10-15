import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  BUILDINGS,
  CLASS_IDS,
  clientMessage,
  freshStorages,
  storagesSchema,
  transferStoredItem,
  moveStorageItem,
  stepCombat,
  tradeItem,
  freshMerchant,
  type SceneState,
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

test('storage-to-storage moves conserve stacks, validate tabs and reject full or stale destinations', () => {
  const player = hero();
  const potion = item('health-potion', 5);
  player.storages![0].items = [potion];
  player.storages![1].items = [
    item('health-potion', 2),
    ...Array.from({ length: 39 }, () => item()),
  ];
  moveStorageItem(player, 0, 1, potion.id);
  assert.equal(player.storages![0].items.length, 0);
  assert.equal(player.storages![1].items.length, 40);
  assert.equal(player.storages![1].items[0].quantity, 7);
  assert.throws(() => moveStorageItem(player, 0, 1, potion.id), /available/);
  player.storages![0].items = [item()];
  const before = structuredClone(player);
  assert.throws(() => moveStorageItem(player, 0, 1, player.storages![0].items[0].id), /full/);
  for (const [fromTab, toTab] of [
    [0, 0],
    [-1, 1],
    [0, 3],
    [0.5, 1],
  ])
    assert.throws(
      () => moveStorageItem(player, fromTab, toTab, player.storages![0].items[0].id),
      /different/,
    );
  assert.deepEqual(player, before);
  for (const [fromTab, toTab] of [
    [-1, 1],
    [0, 3],
    [0.5, 1],
  ])
    assert.equal(
      clientMessage.safeParse({ type: 'moveStorageItem', fromTab, toTab, id: 'x' }).success,
      false,
    );
});

test('account storage and collected gold survive class changes and restart without sharing between accounts', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'emberfall-storage-'));
  const path = join(directory, 'characters.sqlite');
  let store = new CharacterStore(path);
  try {
    await store.ready;
    const saved = store.create('Keeper');
    const player = { ...hero(), ...saved.progress, classId: saved.classId, classes: saved.classes };
    player.storages![1].name = 'Armor';
    player.coins = 13;
    player.backpack = [item()];
    transferStoredItem(player, 1, player.backpack[0].id, true);
    store.save(saved.id, player.name, player);
    store.selectClass(saved.id, player, 'mage');
    assert.equal(player.storages![1].name, 'Armor');
    assert.equal(player.storages![1].items.length, 1);
    assert.equal(player.coins, 13);
    const scene: SceneState = {
      id: 'account-loot',
      type: 'Forest',
      difficulty: 'Easy',
      phase: 'active',
      ready: [],
      countdownAt: null,
      endsAt: 100000,
      nextSpawn: Infinity,
      sequence: 0,
      enemies: [],
      damage: [],
      portals: [],
      drops: [{ id: 1, kind: 'gold', x: player.x, y: player.y, at: 0 }],
    };
    player.scene = 'forest';
    stepCombat(scene, [player], 1000, 0);
    assert.equal(player.coins, 14, 'collected gold credits the live account balance');
    delete player.scene;
    const merchant = freshMerchant();
    tradeItem(player, merchant, merchant.backpack[0].id, true);
    assert.equal(player.coins, 13, 'purchases spend the same shared balance');
    transferStoredItem(player, 1, player.storages![1].items[0].id, false);
    assert(player.backpack!.some((entry) => entry.itemId === 'loot-helmet'));
    transferStoredItem(
      player,
      1,
      player.backpack!.find((entry) => entry.itemId === 'loot-helmet')!.id,
      true,
    );
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
    assert.equal(restored.progress.coins, 13);
    assert.equal(restored.classes.warrior.storages, undefined);
    assert.equal(restored.classes.mage.coins, undefined);
    const document = (await store.database.saves.load(saved.id))!.data as {
      formatVersion: number;
      storehouse: { coins: number };
      classes: Record<string, object>;
    };
    assert.equal(document.formatVersion, 2);
    assert.equal(document.storehouse.coins, 13);
    assert(!JSON.stringify(document.classes).includes('storages'));
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test('legacy class gold and full storages migrate once without losing overflow items', async () => {
  const store = new CharacterStore(':memory:');
  await store.ready;
  try {
    const saved = store.create('Migrating account');
    const classes = Object.fromEntries(
      CLASS_IDS.map((id, index) => {
        const progress = freshProgress(id);
        progress.coins = index + 1;
        progress.backpack = [item('loot-boots')];
        progress.storages = freshStorages().map((storage, tab) => ({
          name: `${id} ${tab + 1}`,
          items: Array.from({ length: 40 }, () => item()),
        }));
        return [id, progress];
      }),
    );
    const document = (await store.database.saves.load(saved.id))!;
    await store.database.saves.save(
      saved.id,
      { formatVersion: 1, classId: 'mage', classes },
      0,
      document.version,
    );
    const migrated = store.load(saved.token);
    assert.equal(migrated.progress.coins, 10);
    assert.equal(migrated.progress.storages![0].name, 'mage 1');
    for (const storage of migrated.progress.storages!) assert.equal(storage.items.length, 40);
    for (const id of CLASS_IDS)
      assert.equal(migrated.classes[id].backpack!.length, id === 'mage' ? 1 : 121);
    const ids = [
      ...migrated.progress.storages!.flatMap((storage) => storage.items.map((entry) => entry.id)),
      ...Object.values(migrated.classes).flatMap((progress) =>
        progress.backpack!.map((entry) => entry.id),
      ),
    ];
    assert.equal(ids.length, 484);
    assert.equal(new Set(ids).size, 484);
    store.save(saved.id, saved.name, {
      ...migrated.progress,
      classId: migrated.classId,
      classes: migrated.classes,
    });
    const again = store.load(saved.token);
    assert.deepEqual(again, migrated);
    store.save(saved.id, saved.name, {
      ...again.progress,
      classId: again.classId,
      classes: again.classes,
    });
    assert.deepEqual(store.load(saved.token), migrated);
  } finally {
    store.close();
  }
});

test('migration combines consumables, preserves names and rejects unsafe gold totals or missing account data', () => {
  const classes = Object.fromEntries(CLASS_IDS.map((id) => [id, freshProgress(id)]));
  classes.warrior.storages![0] = { name: 'Gear', items: [item('health-potion', 2)] };
  classes.ranger.storages![0].items = [item('health-potion', 3)];
  const raw = { formatVersion: 1, classId: 'mage', classes };
  const migrated = decodeProgress(JSON.stringify(raw));
  assert.equal(migrated.progress.storages![0].name, 'Gear');
  assert.equal(migrated.progress.storages![0].items.length, 1);
  assert.equal(migrated.progress.storages![0].items[0].quantity, 5);
  classes.warrior.coins = Number.MAX_SAFE_INTEGER;
  classes.ranger.coins = 1;
  assert.throws(() => decodeProgress(JSON.stringify(raw)));
  assert.throws(() => decodeProgress(JSON.stringify({ ...raw, formatVersion: 2 })));
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
    const move = { type: 'moveStorageItem', fromTab: 0, toTab: 2, id: command.id };
    const stored = structuredClone(player);
    const failMoveSave = t.mock.method(runtime.characters, 'save', () => {
      throw new Error('Test save failure');
    });
    peer.receive(move);
    assert.match(error(), /Unable to save/);
    assert.deepEqual(player, stored);
    failMoveSave.mock.restore();
    peer.receive(move);
    assert.equal(player.storages![0].items.length, 0);
    assert.equal(player.storages![2].items[0].id, command.id);
    peer.receive({ ...move, fromTab: 2, toTab: 0 });
    player.x = 1000;
    peer.receive(move);
    assert.match(error(), /Storehouse/);
    assert.equal(player.storages![0].items.length, 1);
    player.x = building.doorX;
    peer.receive(command);
    assert.match(error(), /available/);
    peer.receive({ type: 'renameStorage', tab: 0, name: ' Gear ' });
    assert.equal(player.storages![0].name, 'Gear');
  } finally {
    await runtime.close();
  }
});
