// Retain the encoder capacity used for the full benchmark snapshot.
const ENCODER_KIB = 128;
// One kibibyte contains exactly 1024 bytes.
const BYTES_PER_KIB = 1024;
// Retain the sixteen-column enemy arrangement for comparable workloads.
const ENEMY_COLUMNS = 16;
// Retain the deterministic random seed for reproducible combat sequences.
const INITIAL_SEED = 12345;
// Retain the existing 32-bit linear-congruential generator multiplier.
const LCG_MULTIPLIER = 1664525;
// Retain the existing 32-bit linear-congruential generator increment.
const LCG_INCREMENT = 1013904223;
// Unsigned shifts retain thirty-two bits of random state.
const RANDOM_BITS = 32;
// Run five hundred ticks including warmup for comparable samples.
const TOTAL_TICKS = 500;
// Retain the synthetic start time with combat timers already active.
const START_TIME_MS = 10000;
// Retain the twenty-Hz simulation cadence.
const STEP_MS = 50;
// The combat API consumes seconds, equivalent to the fifty-millisecond tick.
const STEP_SECONDS = 0.05;
// Exercise the existing eight-player private-world scenario.
const PLAYER_COUNT = 8;
// Exclude the first hundred ticks to remove startup/JIT warmup.
const WARMUP_TICKS = 100;
// Select the ninety-fifth percentile for p95 reporting.
const P95_QUANTILE = 0.95;
// Two-space indentation keeps benchmark JSON readable.
const JSON_INDENT = 2;
import { performance } from 'node:perf_hooks';
import { Encoder } from '@colyseus/schema';
import type { Player, SceneState } from '@emberfall/common';

import { stepCombat, createGame, GAME_MODS } from '@emberfall/core';
import { prepareState, applyState, SessionState } from '@emberfall/common/protocol';
import { SimulationWorld } from '../src/ecs/simulation.ts';
import { freshProgress } from '../src/characters.ts';

Encoder.BUFFER_SIZE = ENCODER_KIB * BYTES_PER_KIB;
const ecs = new SimulationWorld();
const players: Player[] = Array.from({ length: 8 }, (_, i) => {
  return {
    ...freshProgress(),
    id: `p${i}`,
    name: `Player ${i}`,
    color: i,
    x: 2400 + i * 25,
    y: 1280,
    scene: 'forest',
    autoAttack: true,
    autoTarget: true,
    hitpoints: 1e8,
    maxHitpoints: 1e8,
    classId: 'warrior',
  };
});

for (const player of players) {
  ecs.players.set(player.id, player);
}

const scene: SceneState = {
  id: 'benchmark',
  type: 'Forest',
  difficulty: 'Easy',
  phase: 'active',
  ready: [],
  countdownAt: null,
  endsAt: 1e12,
  nextSpawn: 1e12,
  sequence: 160,
  playerCount: 8,
  portals: [],
  damage: [],
  enemies: Array.from({ length: 160 }, (_, i) => {
    return {
      id: i + 1,
      x: 2150 + (i % 16) * 35,
      y: 1050 + Math.floor(i / ENEMY_COLUMNS) * 35,
      hitpoints: 1e8,
      maxHitpoints: 1e8,
      angle: 0,
      archetype: (['skeleton', 'runner', 'brute', 'caster'] as const)[i % 4],
    };
  }),
};
ecs.bind(scene);
const states = players.map(() => {
    return new SessionState();
  }),
  encoders = states.map((state) => {
    return new Encoder(state);
  });
const simulation: number[] = [],
  replication: number[] = [];
let bytes = 0;
let seed = INITIAL_SEED;
const context = createGame(GAME_MODS, () => {
  return (seed = (Math.imul(seed, LCG_MULTIPLIER) + LCG_INCREMENT) >>> 0) / 2 ** RANDOM_BITS;
});

for (let tick = 0; tick < TOTAL_TICKS; tick++) {
  const now = START_TIME_MS + tick * STEP_MS;
  const start = performance.now();
  stepCombat(scene, players, now, STEP_SECONDS, context);
  const simulated = performance.now();
  const projection = prepareState({
    id: 'world',
    name: 'Benchmark',
    hostId: 'p0',
    players,
    scene,
    serverNow: now,
  });

  for (let client = 0; client < PLAYER_COUNT; client++) {
    applyState(states[client], projection);
    const patch = encoders[client].encode();

    if (tick >= WARMUP_TICKS) {
      bytes += patch.byteLength;
    }

    encoders[client].discardChanges();
  }

  if (tick >= WARMUP_TICKS) {
    simulation.push(simulated - start);
    replication.push(performance.now() - simulated);
  }
}

const summary = (values: number[]) => {
  const sorted = [...values].sort((a, b) => {
    return a - b;
  });

  return {
    meanMs:
      values.reduce((sum, value) => {
        return sum + value;
      }, 0) / values.length,
    p95Ms: sorted[Math.floor(sorted.length * P95_QUANTILE)],
    maxMs: sorted.at(-1),
  };
};

console.log(
  JSON.stringify(
    {
      scenario: '8 stationary players, 160 mixed enemies, 20 Hz; 100 warmup and 400 measured ticks',
      simulation: summary(simulation),
      replicationForEightClients: summary(replication),
      totalPatchBytesPerSecond: bytes / ((TOTAL_TICKS - WARMUP_TICKS) * STEP_SECONDS),
      ecsEntities: ecs.ecs.size,
    },
    null,
    JSON_INDENT,
  ),
);
