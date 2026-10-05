import { test } from "node:test";
import assert from "node:assert/strict";
import { Encoder, Decoder } from "@colyseus/schema";
import { SessionState, projectState, materializeState } from "@emberfall/common-new/protocol";
import {
  CLASS_IDS,
  GEAR_DEFINITIONS,
  EQUIPMENT_SLOTS,
  SLOT_GEAR_TYPES,
  characterStats,
  companionStats,
  tickCompanion,
  starterEquipment,
  validateClassEquipment,
  canEquip,
  syncEquipmentVitals,
  createTrainingScene,
  tickPlayerCombat,
  defaultSpellRange,
  requestPlayerCast,
  stepCombat,
  clientMessage,
} from "@emberfall/common-new";
import type { Player, ClassId, GearDefinition, WorldState, Enemy } from "@emberfall/common-new";
import {
  hitWithWeapon,
  tickDebuffs,
  tickPlayerShots,
  fireClassAttack,
} from "../../common-new/src/class-combat.ts";
import { CharacterStore, decodeProgress, freshProgress } from "./characters.ts";
import { drawDamageNumber, DAMAGE_COLORS } from "../../client-new/src/damage-text.ts";

const hero = (classId: ClassId = "warrior"): Player => ({
  ...freshProgress(classId),
  classId,
  id: "p",
  name: "Hero",
  x: 2400,
  y: 1280,
  color: 0,
});
const target = (): Enemy => ({ id: 1, x: 2420, y: 1280, hitpoints: 100, angle: 0 });
const scene = (training = true) => ({
  ...createTrainingScene(0),
  training,
  id: "s",
  enemies: [target()],
  nextSpawn: 1e9,
  endsAt: 1e9,
});

test("Bear inherits gear stats with physical damage, fixed range, health and bleed overrides", (t) => {
  const gear: GearDefinition = {
    id: "bear-test-ring",
    name: "Test ring",
    gearType: "ring",
    stats: { power: 10, attacksPerSecond: 1, armor: 100, maxHitpoints: 20, maxManapoints: 30 },
  };
  GEAR_DEFINITIONS[gear.id] = gear;
  t.after(() => delete GEAR_DEFINITIONS[gear.id]);
  t.mock.method(Math, "random", () => 0.5);
  for (const training of [true, false]) {
    const player = hero("druid");
    player.equipment!.ring = gear.id;
    player.autoAttack = false;
    if (!training) player.scene = "forest";
    syncEquipmentVitals(player);
    const stats = companionStats(player);
    assert.deepEqual(stats, {
      ...characterStats(player),
      damageType: "physical",
      range: 250,
      manualRange: 250,
      maxHitpoints: 180,
    });
    const arena = scene(training);
    // A target inside the owner leash, but over 88 units from Bear.
    arena.enemies[0].x = player.x + 190;
    tickCompanion(player, arena, 1000, 0);
    assert.equal(player.bear!.maxHitpoints, 180);
    assert.equal(arena.damage[0].amount, 13);
    assert.equal(arena.damage[0].damageType, "physical");
    assert.equal(arena.damage[0].ownerId, player.id);
    tickCompanion(player, arena, 1259, 0);
    assert.equal(arena.damage.length, 1, "no duplicate hit during a swing");
    tickCompanion(player, arena, 1499, 0);
    assert.equal(arena.damage.length, 1);
    tickCompanion(player, arena, 1500, 0);
    assert.equal(arena.damage.length, 2, "inherits the 500ms gear cadence");
    if (!training) {
      arena.enemies[0].x = player.x - 100;
      player.bear!.x = player.x - 100;
      arena.enemies[0].attack = {
        startedAt: 1500,
        endsAt: 2000,
        x: player.bear!.x,
        y: player.bear!.y,
        radius: 30,
        ranged: false,
      };
      stepCombat(arena, [player], 2000, 0);
      assert.equal(player.bear!.hitpoints, 175, "owner armor halves incoming damage");
    }
    player.equipment = {};
    tickCompanion(player, arena, 3000, 0);
    assert.equal(player.bear!.attackAt, undefined);
  }
});

test("Bear critical and 10% bleed boundaries work in forest and training across a seam", (t) => {
  for (const training of [true, false]) {
    for (const roll of [0, 0.049999, 0.05, 0.099999, 0.1]) {
      const random = t.mock.method(Math, "random", () => roll);
      const player = hero("druid");
      if (!training) player.scene = "forest";
      player.x = 5;
      const arena = scene(training);
      arena.enemies[0].x = 4800 - 185;
      tickCompanion(player, arena, 1000, 0);
      assert.equal(arena.damage[0].critical, roll < 0.05);
      assert.equal(arena.damage[0].amount, roll < 0.05 ? 4.5 : 3);
      assert.equal(arena.damage[0].damageType, "physical");
      assert.equal(arena.enemies[0].debuffs?.length ?? 0, roll < 0.1 ? 1 : 0);
      if (roll < 0.1) {
        assert.equal(arena.enemies[0].debuffs![0].kind, "bleed");
        tickDebuffs(arena, [player], 2000);
        assert.equal(arena.damage.at(-1)!.amount, 1);
        assert.equal(arena.damage.at(-1)!.ownerId, player.id);
      }
      random.mock.restore();
    }
  }
});

test("every class starts with exactly its compatible weapon and preserves base stats", () => {
  const expected = {
    warrior: [5, 88, "physical"],
    ranger: [5, 1000, "poison"],
    mage: [3, 250, "fire"],
    druid: [3, 250, "nature"],
  };
  for (const classId of CLASS_IDS) {
    const player = hero(classId);
    assert.deepEqual(Object.keys(player.equipment!), ["weapon"]);
    const stats = characterStats(player);
    assert.deepEqual([stats.power, stats.range, stats.damageType], expected[classId]);
    assert.equal(stats.attackIntervalMs, 1000);
    assert.equal(stats.criticalChance, 0.05);
    assert.equal(stats.criticalMultiplier, 1.5);
    assert.deepEqual(validateClassEquipment(player.equipment!, classId), player.equipment);
  }
  assert.throws(() => validateClassEquipment({ weapon: "mage-staff" }, "warrior"));
  assert.throws(() => validateClassEquipment({ ring: "warrior-sword" }, "warrior"));
  assert.throws(() => validateClassEquipment({ weapon: "forged-item" }, "warrior"));
  assert.throws(() => validateClassEquipment({ unknown: "warrior-sword" } as never, "warrior"));
  for (const [gearType, allowed] of [
    ["shield", "warrior"],
    ["quiver", "ranger"],
    ["orb", "mage"],
    ["natureFocus", "druid"],
  ] as const) {
    const item: GearDefinition = { id: "test", name: "Off-hand", gearType, stats: {} };
    for (const classId of CLASS_IDS)
      assert.equal(canEquip("offHand", item, classId), classId === allowed);
  }
});

test("all class base attacks wait a full second in training and forest", () => {
  for (const training of [true, false]) {
    for (const classId of CLASS_IDS) {
      const player = hero(classId);
      if (!training) player.scene = "forest";
      else Object.assign(player, { x: 140, y: 340 });
      const arena = scene(training);
      tickPlayerCombat(arena, [player], 1000, 0);
      assert.equal(player.attackAt, 1000);
      tickPlayerCombat(arena, [player], 1999, 0);
      assert.equal(player.attackAt, 1000, `${classId} cannot attack early`);
      tickPlayerCombat(arena, [player], 2000, 0);
      assert.equal(player.attackAt, 2000, `${classId} attacks at the cooldown boundary`);
      if (training) assert.equal(player.experience, 0);
    }
  }
});

test("all nine slots aggregate and gear controls real power, range, cadence and defense", (t) => {
  t.mock.method(Math, "random", () => 0.5);
  const player = hero();
  for (const slot of EQUIPMENT_SLOTS.filter((slot) => slot !== "weapon")) {
    const id = `test-${slot}`;
    GEAR_DEFINITIONS[id] = {
      id,
      name: id,
      gearType: SLOT_GEAR_TYPES[slot][0],
      stats: {
        power: 1,
        attacksPerSecond: 1 / 8,
        range: 2,
        manualRange: 2,
        armor: 12.5,
        maxHitpoints: 5,
        maxManapoints: 2,
      },
    };
    player.equipment![slot] = id;
    t.after(() => {
      delete GEAR_DEFINITIONS[id];
    });
  }
  const stats = characterStats(player);
  assert.equal(stats.power, 13);
  assert.equal(defaultSpellRange(player), 104);
  assert.equal(stats.damageReduction, 0.5);
  syncEquipmentVitals(player);
  assert.equal(player.maxHitpoints, 140);
  assert.equal(player.maxManapoints, 66);
  const arena = scene(false);
  player.scene = "forest";
  arena.enemies[0].x = player.x + 110;
  tickPlayerCombat(arena, [player], 1000, 0.05);
  assert.equal(arena.enemies[0].hitpoints, 87, "extended sword range and summed power apply");
  const interval = stats.attackIntervalMs;
  tickPlayerCombat(arena, [player], 1000 + interval - 1, 0.05);
  assert.equal(arena.enemies[0].hitpoints, 87);
  tickPlayerCombat(arena, [player], 1000 + interval, 0.05);
  assert.equal(arena.enemies[0].hitpoints, 74);
  player.autoAttack = false;
  arena.enemies[0].x = player.x;
  Object.assign(arena.enemies[0], {
    attack: { startedAt: 0, endsAt: 2000, x: player.x, y: player.y, radius: 100, ranged: false },
  });
  stepCombat(arena, [player], 2000, 0.05);
  assert.equal(player.hitpoints, 95, "100 armor halves a 10 damage enemy attack");
});

test("critical boundary is exactly five percent, with fractional 150% power in both areas", (t) => {
  for (const training of [true, false])
    for (const classId of CLASS_IDS) {
      const player = hero(classId);
      for (const roll of [0, 0.049999, 0.05, 0.99]) {
        const random = t.mock.method(Math, "random", () => roll);
        const arena = scene(training);
        hitWithWeapon(arena, arena.enemies[0], player, 1000);
        const hit = arena.damage[0];
        assert.equal(hit.critical, roll < 0.05);
        assert.equal(hit.amount, characterStats(player).power * (roll < 0.05 ? 1.5 : 1));
        assert.equal(hit.damageType, characterStats(player).damageType);
        if (training) assert.equal(player.experience, 0);
        random.mock.restore();
      }
    }
});

test("projectile and splash hits carry weapon metadata; ailments never critically hit", (t) => {
  t.mock.method(Math, "random", () => 0);
  for (const classId of ["ranger", "mage", "druid"] as const) {
    const player = hero(classId);
    const arena = scene();
    arena.enemies.push({ ...target(), id: 2, y: 1310 });
    fireClassAttack(arena, player, 1000);
    tickPlayerShots(arena, [player], 1050, 0.05);
    assert(arena.damage.length > 0);
    assert(
      arena.damage.every(
        (hit) =>
          hit.ownerId === player.id &&
          hit.critical &&
          hit.damageType === characterStats(player).damageType,
      ),
    );
    if (classId === "mage") assert(arena.damage.some((hit) => hit.amount === 1.5));
    const before = arena.damage.length;
    tickDebuffs(arena, [player], 2050);
    assert(arena.damage.slice(before).every((hit) => hit.critical === false));
  }
});

test("empty weapons cannot attack, while client messages cannot inject equipment", () => {
  const player = { ...hero(), equipment: {}, scene: "forest" as const };
  const arena = scene(false);
  tickPlayerCombat(arena, [player], 1000, 0.05);
  assert.equal(arena.damage.length, 0);
  assert.equal(defaultSpellRange(player), 0);
  assert.equal(
    requestPlayerCast(
      arena,
      player,
      {
        type: "cast",
        id: 1,
        epoch: "s",
        classId: "warrior",
        autoTarget: true,
        aimX: 2400,
        aimY: 1280,
      },
      1000,
    ),
    false,
  );
  const parsed = clientMessage.parse({
    type: "selectClass",
    classId: "mage",
    equipment: { weapon: "warrior-sword" },
    power: 9999,
  });
  assert.deepEqual(parsed, { type: "selectClass", classId: "mage" });
});

test("legacy saves acquire class-specific equipment; empty loadouts and class switching persist", async () => {
  const legacy = decodeProgress(
    JSON.stringify({
      classId: "mage",
      classes: Object.fromEntries(CLASS_IDS.map((id) => [id, freshProgress()])),
    }),
  );
  for (const id of CLASS_IDS) assert.deepEqual(legacy.classes[id].equipment, starterEquipment(id));
  const store = new CharacterStore(":memory:");
  await store.ready;
  try {
    const created = store.create("Hero");
    const player = { ...hero(), ...created.progress, classes: created.classes };
    player.equipment = {};
    store.save(created.id, player.name, player);
    store.selectClass(created.id, player, "mage");
    assert.deepEqual(player.equipment, starterEquipment("mage"));
    store.selectClass(created.id, player, "warrior");
    assert.deepEqual(player.equipment, {});
    assert.deepEqual(store.load(created.token).progress.equipment, {});
    assert.throws(() =>
      store.save(created.id, player.name, { ...player, equipment: { weapon: "mage-staff" } }),
    );
    assert.deepEqual(store.load(created.token).progress.equipment, {});
  } finally {
    store.close();
  }
});

test("native protocol patches retain equipment and typed critical damage in detached snapshots", () => {
  const world: WorldState = {
    id: "w",
    name: "World",
    hostId: "p",
    players: [hero("mage")],
    training: scene(),
  };
  world.training!.damage = [
    {
      id: 50,
      target: "enemy:1",
      x: 2420,
      y: 1280,
      at: 1000,
      amount: 4.5,
      ownerId: "p",
      damageType: "fire",
      critical: true,
    },
  ];
  const state = new SessionState(),
    received = new SessionState();
  const encoder = new Encoder(state),
    decoder = new Decoder(received);
  projectState(state, world);
  decoder.decode(encoder.encodeAll());
  encoder.discardChanges();
  const first = materializeState(received)!;
  assert.deepEqual(first.players[0].equipment, starterEquipment("mage"));
  assert.deepEqual(first.training!.damage, world.training!.damage);
  world.players[0].equipment = {};
  projectState(state, world);
  decoder.decode(encoder.encode());
  assert.deepEqual(materializeState(received)!.players[0].equipment, {});
  assert.deepEqual(first.players[0].equipment, starterEquipment("mage"));
});

test("damage text uses type colors, with white fill over a thick red critical outline", () => {
  const calls: { operation: string; color: unknown; width?: number }[] = [];
  const ctx = {
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    save() {},
    restore() {},
    fillText(this: CanvasRenderingContext2D) {
      calls.push({ operation: "fill", color: this.fillStyle });
    },
    strokeText(this: CanvasRenderingContext2D) {
      calls.push({ operation: "stroke", color: this.strokeStyle, width: this.lineWidth });
    },
  } as unknown as CanvasRenderingContext2D;
  for (const damageType of ["physical", "fire", "poison", "nature"] as const) {
    const hit = { id: 1, amount: 4.5, x: 0, y: 0, at: 1000, target: "enemy:1", damageType };
    calls.length = 0;
    drawDamageNumber(ctx, hit, { x: 0, y: 0 }, 1000);
    assert.deepEqual(calls, [{ operation: "fill", color: DAMAGE_COLORS[damageType] }]);
    calls.length = 0;
    drawDamageNumber(ctx, { ...hit, critical: true }, { x: 0, y: 0 }, 1000);
    assert.deepEqual(calls, [
      { operation: "stroke", color: "#d52b3f", width: 4 },
      { operation: "fill", color: "#ffffff" },
    ]);
  }
});
