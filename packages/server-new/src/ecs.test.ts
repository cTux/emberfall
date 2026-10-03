import { test } from "node:test";
import assert from "node:assert/strict";
import { SimulationWorld } from "./ecs/simulation.ts";
import {
  appendSceneEntities,
  createTrainingScene,
  stepCombat,
  type Player,
  type SceneState,
} from "@emberfall/common-new";
import { freshProgress } from "./characters.ts";

test("ECS collections preserve identity and explicit order across removal and scene disposal", () => {
  const world = new SimulationWorld();
  const scene = createTrainingScene(0);
  world.bind(scene);
  const first = scene.enemies[0],
    last = scene.enemies.at(-1)!;
  assert.equal(world.ecs.with("enemies").size, 7);
  scene.enemies = scene.enemies.filter((enemy) => enemy !== first);
  assert.equal(scene.enemies.at(-1), last);
  last.hitpoints = 12;
  assert.equal(
    [...world.ecs.with("enemies")].find((e) => e.enemies === last)!.enemies.hitpoints,
    12,
  );
  appendSceneEntities(scene, "enemies", first);
  assert.equal(scene.enemies.at(-1), first);
  assert.throws(
    () => scene.enemies.push(first),
    TypeError,
    "membership is changed through the collection boundary",
  );
  world.retain([]);
  assert.equal(world.ecs.size, 0);
  assert.equal(scene.enemies.length, 7);
  assert(!Object.isFrozen(scene.enemies), "disposed snapshots are ordinary data again");
});

test("ECS-backed and plain-object combat produce the same state through spawns, hits and cleanup", () => {
  const entityWorld = new SimulationWorld();
  const player: Player = {
    ...freshProgress(),
    id: "p",
    name: "p",
    color: 0,
    x: 2400,
    y: 1280,
    scene: "forest",
    classId: "mage",
    autoTarget: true,
  };
  const scene: SceneState = {
    ...createTrainingScene(0),
    training: false,
    id: "forest",
    endsAt: 8000,
    nextSpawn: 0,
    enemies: [],
  };
  const ecsScene = structuredClone(scene),
    ecsPlayer = structuredClone(player);
  entityWorld.players.set(player.id, ecsPlayer);
  entityWorld.bind(ecsScene);
  const random = Math.random;
  try {
    for (let tick = 0; tick < 300; tick++) {
      const seed = tick + 100;
      const seeded = () => {
        let state = seed;
        return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
      };
      Math.random = seeded();
      stepCombat(scene, [player], tick * 50, 0.05);
      Math.random = seeded();
      stepCombat(
        ecsScene,
        [...entityWorld.actors].map((e) => e.player),
        tick * 50,
        0.05,
      );
      assert.deepEqual(
        JSON.parse(JSON.stringify(ecsScene)),
        JSON.parse(JSON.stringify(scene)),
        `tick ${tick}`,
      );
      assert.deepEqual(ecsPlayer, player);
    }
  } finally {
    Math.random = random;
  }
});
