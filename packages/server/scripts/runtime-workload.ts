import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { starterEquipment, syncEquipmentVitals } from '@emberfall/core';
import type { createRuntime } from '../src/runtime.ts';

export const BENCHMARK = {
  worlds: [1, 4, 8],
  playersPerWorld: 4,
  enemiesPerWorld: 40,
  warmupMs: 5000,
  sampleMs: 35000,
  inputMs: 50,
  healMs: 250,
} as const;

type Runtime = Awaited<ReturnType<typeof createRuntime>>;

/** Fixture arrangement only; simulation, replication and autosaves remain production-owned. */
export function arrangeWorkload(
  worlds: Runtime['worlds'],
  parties: Runtime['parties'],
  count: number,
) {
  const occupied = [...worlds.values()].filter((world) => {
    return world.players.size;
  });
  assert.equal(occupied.length, count);
  assert.equal(worlds.size, count + 1, 'Include the normal empty permanent world');
  const scenes: Record<string, string> = {};
  let healedDamage = 0;
  for (const world of occupied) {
    const players = [...world.players.values()];
    assert.equal(players.length, BENCHMARK.playersPerWorld);
    const group = parties(world);
    for (const [index, player] of players.slice(1).entries()) {
      const now = Date.now() + index * 1001;
      group.request(players[0], player, now);
      group.accept(player, players[0].id, now);
    }

    const run = group.run(players[0]);
    for (const [index, player] of players.entries()) {
      const classId = (['warrior', 'ranger', 'mage', 'druid'] as const)[index];
      Object.assign(player, {
        classId,
        equipment: starterEquipment(classId),
        scene: 'forest',
        runId: run.runKey,
        x: 2400 + index * 25,
        y: 1280,
        autoAttack: true,
        autoTarget: true,
      });
      syncEquipmentVitals(player);
      player.hitpoints = player.maxHitpoints;
    }

    const id = randomUUID();
    scenes[world.id] = id;
    run.scene = {
      id,
      type: 'Forest',
      difficulty: 'Easy',
      phase: 'active',
      ready: [],
      countdownAt: null,
      endsAt: Date.now() + 120_000,
      nextSpawn: Date.now() + 120_000,
      sequence: BENCHMARK.enemiesPerWorld,
      playerCount: players.length,
      electorate: '',
      portals: [],
      damage: [],
      enemies: Array.from({ length: BENCHMARK.enemiesPerWorld }, (_, index) => {
        return {
          id: index + 1,
          x: 2200 + (index % 8) * 35,
          y: 1160 + Math.floor(index / 8) * 35,
          hitpoints: 1e8,
          maxHitpoints: 1e8,
          angle: 0,
          archetype: (['skeleton', 'runner', 'brute', 'caster'] as const)[index % 4],
        };
      }),
    };
  }

  const healing = setInterval(() => {
    for (const world of occupied) {
      for (const player of world.players.values()) {
        assert(player.hitpoints > 0, 'A benchmark player died; workload is no longer steady');
        healedDamage += Math.max(0, player.maxHitpoints - player.hitpoints);
        player.hitpoints = player.maxHitpoints;
      }
    }
  }, BENCHMARK.healMs);

  return {
    scenes,
    reset() {
      healedDamage = 0;
    },
    check() {
      for (const world of occupied) {
        assert.equal(world.players.size, BENCHMARK.playersPerWorld);
        const scene = parties(world).run([...world.players.values()][0]).scene!;
        assert.equal(scene.phase, 'active');
        assert.equal(scene.enemies.length, BENCHMARK.enemiesPerWorld);
        assert(
          scene.enemies.some((enemy) => {
            return enemy.hitpoints < 1e8;
          }),
          'Combat must actually run',
        );
      }

      assert(healedDamage > 0, 'Enemy damage must actually run');

      return { occupiedWorlds: count, players: count * 4, enemies: count * 40, healedDamage };
    },
    close: () => {
      return clearInterval(healing);
    },
  };
}
