import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  addItem,
  useBackpackItem,
  unequipItem,
  tradeItem,
  freshMerchant,
  characterStats,
  CLASS_IDS,
  LOOT_ITEM_IDS,
  GEAR_DEFINITIONS,
  backpackSchema,
  clientMessage,
  createTrainingScene,
  requestPlayerCast,
  stepCombat,
} from "@emberfall/common-new";
import type { Player } from "@emberfall/common-new";
import { hitEnemy } from "../../common-new/src/class-combat.ts";
import { CharacterStore, freshProgress, decodeProgress } from "./characters.ts";
import { createRuntime } from "./runtime.ts";
import { Peer } from "./network/peer.ts";
import { INNKEEPER, type ServerMessage } from "@emberfall/common-new";

const hero = (): Player => ({
  ...freshProgress("warrior"),
  classId: "warrior",
  id: "p",
  name: "Hero",
  x: 2400,
  y: 1280,
  color: 0,
});
const item = (itemId: string, quantity = 1) => ({ id: crypto.randomUUID(), itemId, quantity });

test("unlimited gear exchange updates totals and weapon removal rejects casts in every class", () => {
  for (const classId of CLASS_IDS) {
    const player = { ...hero(), ...freshProgress(classId), classId };
    player.backpack = Array.from({ length: 80 }, () => item("loot-helmet"));
    useBackpackItem(player, player.backpack[0].id);
    assert.equal(characterStats(player).armor, 1);
    useBackpackItem(player, player.backpack[0].id);
    assert.equal(player.backpack.length, 79, "replaced helmet goes back into backpack");
    assert.equal(characterStats(player).armor, 1);
    unequipItem(player, "helmet");
    assert.equal(characterStats(player).armor, 0);
    const weapon = player.equipment!.weapon;
    unequipItem(player, "weapon");
    assert.equal(characterStats(player).hasWeapon, false);
    const scene = { ...createTrainingScene(0), training: false };
    player.scene = "forest";
    requestPlayerCast(
      scene,
      player,
      { type: "cast", id: 1, epoch: scene.id, classId, autoTarget: false, aimX: 2500, aimY: 1280 },
      1000,
    );
    assert.equal(player.attackAt, undefined);
    const backpackWeapon = player.backpack.find((item) => item.itemId === weapon)!;
    useBackpackItem(player, backpackWeapon.id);
    assert.equal(characterStats(player).hasWeapon, true);
    assert.equal(
      requestPlayerCast(
        scene,
        player,
        {
          type: "cast",
          id: 2,
          epoch: scene.id,
          classId,
          autoTarget: false,
          aimX: 2500,
          aimY: 1280,
        },
        1000,
      ),
      true,
    );
    const incompatible = item(classId === "warrior" ? "loot-orb" : "loot-shield");
    player.backpack.push(incompatible);
    const before = structuredClone(player);
    assert.throws(() => useBackpackItem(player, incompatible.id), /cannot equip/);
    assert.deepEqual(player, before);
  }
});

test("consumables stack, heal one at a time and remain unused at full health", () => {
  const player = hero();
  player.backpack = [];
  addItem(player.backpack, item("health-potion", 3));
  addItem(player.backpack, item("health-potion", 2));
  assert.equal(player.backpack.length, 1);
  assert.equal(player.backpack[0].quantity, 5);
  const id = player.backpack[0].id;
  assert.throws(() => useBackpackItem(player, id), /healing/);
  player.hitpoints = 80;
  useBackpackItem(player, id);
  assert.equal(player.hitpoints, 100);
  assert.equal(player.backpack[0].quantity, 4);
  player.hitpoints = 0;
  assert.throws(() => useBackpackItem(player, id), /healing/);
  assert.equal(player.backpack[0].quantity, 4);
  player.hitpoints = 1;
  for (let i = 0; i < 4; i++) useBackpackItem(player, id);
  assert.equal(player.backpack.length, 0);
});

test("shared merchant trades conserve items and gold, reject stale and unaffordable purchases", () => {
  const player = hero();
  const merchant = freshMerchant();
  const helmet = item("loot-helmet");
  player.backpack = [helmet];
  tradeItem(player, merchant, helmet.id, false);
  assert.equal(player.coins, 1);
  assert.equal(merchant.coins, 4999);
  assert.equal(player.backpack.length, 0);
  const sold = merchant.backpack.find((item) => item.itemId === helmet.itemId)!;
  const second = hero();
  second.coins = 1;
  tradeItem(second, merchant, sold.id, true);
  assert.equal(second.coins, 0);
  assert.equal(second.backpack![0].itemId, helmet.itemId);
  assert.equal(merchant.coins, 5000);
  assert.throws(() => tradeItem(player, merchant, sold.id, true), /available/);
  const potion = merchant.backpack[0];
  tradeItem(player, merchant, potion.id, true);
  assert.equal(potion.quantity, 4);
  assert.equal(player.backpack[0].quantity, 1);
  const before = structuredClone({ player, merchant });
  assert.throws(() => tradeItem(player, merchant, potion.id, true), /gold/);
  assert.deepEqual({ player, merchant }, before);
});

test("backpack and command validation reject unknown items, forged stacks and duplicates", () => {
  assert.equal(backpackSchema.safeParse([item("missing")]).success, false);
  assert.equal(backpackSchema.safeParse([item("__proto__")]).success, false);
  assert.equal(backpackSchema.safeParse([item("loot-helmet", 2)]).success, false);
  const entry = item("loot-boots");
  assert.equal(backpackSchema.safeParse([entry, entry]).success, false);
  assert.equal(clientMessage.safeParse({ type: "unequip", slot: "unknown" }).success, false);
  assert.equal(clientMessage.safeParse({ type: "trade", id: "a", buying: "yes" }).success, false);
  assert.deepEqual(decodeProgress(JSON.stringify(freshProgress())).progress.backpack, []);
});

test("every forest kill drops non-weapon 1-armor 1-gold gear, collected once across a wrapped seam; training drops none", (t) => {
  for (const [index, id] of LOOT_ITEM_IDS.entries()) {
    t.mock.method(Math, "random", () => (index + 0.5) / LOOT_ITEM_IDS.length);
    const player = hero();
    player.scene = "forest";
    player.x = 4798;
    player.y = 1280;
    const scene = {
      ...createTrainingScene(0),
      training: false,
      enemies: [],
      endsAt: 1e9,
      nextSpawn: 1e9,
    };
    hitEnemy(scene, { id: 1, x: 8, y: 1280, hitpoints: 1, angle: 0 }, 2, player, 1000);
    const drop = scene.drops!.find((drop) => drop.kind === "item")!;
    assert.equal(drop.itemId, id);
    assert.equal(GEAR_DEFINITIONS[id].stats.armor, 1);
    assert.equal(GEAR_DEFINITIONS[id].price, 1);
    assert(!["sword", "bow", "fireStaff", "natureStaff"].includes(GEAR_DEFINITIONS[id].gearType));
    stepCombat(scene, [player], 1400, 0.05);
    assert.equal(player.backpack!.length, 1);
    stepCombat(scene, [player], 1450, 0.05);
    assert.equal(player.backpack!.length, 1);
    const training = createTrainingScene(0);
    hitEnemy(training, { id: 1, x: 8, y: 1280, hitpoints: 1, angle: 0 }, 2, player, 1000);
    assert.equal(training.drops?.length ?? 0, 0);
    t.mock.restoreAll();
  }
});

test("trade save survives restart and rolls both owners back on failed validation", async () => {
  const directory = await mkdtemp(join(tmpdir(), "emberfall-inventory-"));
  const path = join(directory, "save.sqlite");
  let store = new CharacterStore(path);
  await store.ready;
  try {
    const saved = store.create("Trader");
    const worldId = crypto.randomUUID();
    store.saveWorld({ id: worldId, name: "World", salt: "" }, true);
    const player = { ...hero(), ...saved.progress };
    player.backpack = [item("loot-helmet")];
    const merchant = store.merchant(worldId);
    tradeItem(player, merchant, player.backpack[0].id, false);
    store.save(saved.id, player.name, player, { worldId, state: merchant });
    const bad = { ...player, coins: 999 };
    assert.throws(() =>
      store.save(saved.id, player.name, bad, { worldId, state: { ...merchant, coins: -1 } }),
    );
    assert.equal(store.load(saved.token).progress.coins, 1);
    assert.equal(store.merchant(worldId).coins, 4999);
    store.close();
    store = new CharacterStore(path);
    await store.ready;
    assert.equal(store.load(saved.token).progress.coins, 1);
    assert.equal(
      store.merchant(worldId).backpack.find((entry) => entry.itemId === "loot-helmet")?.quantity,
      1,
    );
    assert.equal(store.merchant(worldId).coins, 4999);
  } finally {
    store.close();
    await rm(directory, { recursive: true, force: true });
  }
});

test("session-owned commands reject remote trading and retain live items after a failed save", async (t) => {
  const runtime = await createRuntime();
  const messages: ServerMessage[] = [];
  const peer = new Peer(
    (message) => messages.push(message),
    () => {},
  );
  try {
    runtime.connect(peer);
    const world = [...runtime.worlds.values()][0];
    peer.receive({ type: "join", worldId: world.id, playerName: "Trader", password: "" });
    for (let i = 0; i < 200 && !world.players.size; i++)
      await new Promise((resolve) => setTimeout(resolve, 10));
    assert.equal(world.players.size, 1);
    const player = [...world.players.values()][0];
    player.backpack = [item("loot-helmet")];
    peer.receive({ type: "trade", id: player.backpack[0].id, buying: false });
    assert.match((messages.at(-1) as { message: string }).message, /Trade near Marta/);
    assert.equal(player.backpack.length, 1);
    player.x = INNKEEPER.x;
    player.y = INNKEEPER.y - 15;
    const before = structuredClone(player);
    const failSave = t.mock.method(runtime.characters, "save", () => {
      throw new Error("Test database failure");
    });
    peer.receive({ type: "trade", id: player.backpack[0].id, buying: false });
    assert.match((messages.at(-1) as { message: string }).message, /Unable to save/);
    assert.deepEqual(player, before);
    assert.equal(world.merchant!.coins, 5000);
    assert.equal(world.merchant!.backpack.length, 1);
    failSave.mock.restore();
    peer.receive({ type: "trade", id: player.backpack[0].id, buying: false, coins: 99999 });
    assert.equal(player.backpack.length, 0);
    assert.equal(player.coins, 1, "wire currency cannot override the server calculation");
    const soldId = world.merchant!.backpack.find((entry) => entry.itemId === "loot-helmet")!.id;
    peer.receive({ type: "trade", id: soldId, buying: true });
    peer.receive({ type: "trade", id: soldId, buying: true });
    assert.match((messages.at(-1) as { message: string }).message, /no longer available/);
    assert.equal(player.backpack.length, 1);
    assert.equal(player.coins, 0);
    assert.equal(world.merchant!.coins, 5000);
  } finally {
    t.mock.restoreAll();
    await runtime.close();
  }
});
