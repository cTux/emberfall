import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { createHash } from "node:crypto";
import * as original from "../packages/common/src/index.ts";
import * as replacement from "../packages/common-new/src/index.ts";
import {
  validateDefinitions,
  GAME_DEFINITIONS,
} from "../packages/common-new/src/definitions/index.ts";

function files(root: string): string[] {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(root, entry.name);
    return entry.isDirectory() ? files(path) : [path];
  });
}

test("new runtime imports and dependencies remain independent", () => {
  for (const name of ["client", "server", "common"]) {
    const root = resolve(`packages/${name}-new`);
    const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
    for (const dependency of Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
    })) {
      assert(!/^@emberfall\/(client|server|common)$/.test(dependency), dependency);
    }
    for (const path of files(resolve(root, "src")).filter((path) => /\.[cm]?[jt]sx?$/.test(path))) {
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(/(?:from\s*|import\s*\(|import\s*)["']([^"']+)["']/g)) {
        const specifier = match[1];
        assert(
          !/^@emberfall\/(client|server|common)(?:\/|$)/.test(specifier),
          `${path}: ${specifier}`,
        );
        if (specifier.startsWith(".")) {
          const target = resolve(path, "..", specifier);
          for (const original of ["client", "server", "common"]) {
            assert(
              !target.startsWith(resolve(`packages/${original}`) + "/") &&
                !target.startsWith(resolve(`packages/${original}`) + "\\"),
              `${path}: ${specifier}`,
            );
          }
        }
      }
    }
  }
});

test("original shipped assets and attribution remain intact alongside the new art collection", () => {
  const originalRoot = resolve("packages/client/public");
  const newRoot = resolve("packages/client-new/public");
  const hash = (path: string) => createHash("sha256").update(readFileSync(path)).digest("hex");
  const originalFiles = files(originalRoot)
    .map((path) => relative(originalRoot, path))
    .sort();
  assert.deepEqual(
    files(newRoot)
      .map((path) => relative(newRoot, path))
      .filter((path) => !path.replaceAll("\\", "/").startsWith("assets/wardrobe-style/"))
      .sort(),
    originalFiles,
  );
  for (const path of originalFiles)
    assert.equal(hash(resolve(newRoot, path)), hash(resolve(originalRoot, path)), path);
});

// Deliberately outside the new packages: runtime packages never depend on the
// original implementation. This development check compares the two solutions.
test("ported definitions and generated geometry match the original game", () => {
  validateDefinitions();
  assert.deepEqual(JSON.parse(JSON.stringify(GAME_DEFINITIONS)), GAME_DEFINITIONS);
  for (const key of [
    "ARENA",
    "FOREST",
    "TREES",
    "BUILDINGS",
    "PATHS",
    "TORCHES",
    "CLASS_IDS",
    "CLASS_LABELS",
    "ENEMY_HP",
    "ENEMY_STATS",
    "LOBBY_PORTAL",
    "FOREST_PORTAL",
    "WARDROBE",
    "TICK_MS",
    "MAX_PLAYERS",
    "CHAT_LIMIT",
    "CHAT_MAX_LENGTH",
  ] as const)
    assert.deepEqual(replacement[key], original[key], key);
  assert.deepEqual(
    replacement.TRAINING_ZONES,
    original.TRAINING_ZONES.map((zone) => ({
      ...zone,
      radius: zone.radius * 2,
      clearingRadius: zone.radius,
    })),
  );
  for (const x of [-50, 0, 50, 1200, 4799, 4850])
    for (const y of [-20, 0, 1280, 2559, 2600]) {
      assert.deepEqual(replacement.forestTrees(x, y, 300), original.forestTrees(x, y, 300));
    }
  for (const classId of original.CLASS_IDS)
    for (const autoTarget of [true, false]) {
      assert.equal(
        replacement.defaultSpellRange({ classId, autoTarget }),
        original.defaultSpellRange({ classId, autoTarget }),
      );
    }
});

test("all class simulations retain original results across a seeded encounter", () => {
  const random = Math.random;
  try {
    for (const classId of original.CLASS_IDS) {
      const player: original.Player = {
        id: "hero",
        name: "Hero",
        classId,
        color: 0,
        x: 2400,
        y: 1280,
        scene: "forest",
        level: 1,
        experience: 0,
        hitpoints: 100,
        maxHitpoints: 100,
        playtimeSeconds: 0,
        talents: {},
        autoTarget: true,
        autoAttack: true,
      };
      const scene: original.SceneState = {
        id: "forest",
        type: "Forest",
        difficulty: "Easy",
        phase: "active",
        ready: [],
        countdownAt: null,
        endsAt: 8000,
        nextSpawn: 0,
        sequence: 0,
        enemies: [],
        damage: [],
        portals: [],
      };
      const nextPlayer = structuredClone(player),
        nextScene = structuredClone(scene);
      for (let tick = 0; tick < 600; tick++) {
        const seeded = () => {
          let n = tick + 123;
          return () => (n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 2 ** 32;
        };
        Math.random = seeded();
        original.stepCombat(scene, [player], tick * 50, 0.05);
        Math.random = seeded();
        replacement.stepCombat(nextScene, [nextPlayer], tick * 50, 0.05);
        assert.deepEqual(nextPlayer, player, `${classId} player tick ${tick}`);
        assert.deepEqual(nextScene, scene, `${classId} scene tick ${tick}`);
      }
    }
  } finally {
    Math.random = random;
  }
});
