import { performance } from "node:perf_hooks";
import { Encoder } from "@colyseus/schema";
import { stepCombat, type Player, type SceneState } from "@emberfall/common-new";
import { prepareState, applyState, SessionState } from "@emberfall/common-new/protocol";
import { SimulationWorld } from "../src/ecs/simulation.ts";
import { freshProgress } from "../src/characters.ts";

Encoder.BUFFER_SIZE = 128 * 1024;
const ecs = new SimulationWorld();
const players: Player[] = Array.from({ length: 8 }, (_, i) => ({
  ...freshProgress(),
  id: `p${i}`,
  name: `Player ${i}`,
  color: i,
  x: 2400 + i * 25,
  y: 1280,
  scene: "forest",
  autoAttack: true,
  autoTarget: true,
  hitpoints: 1e8,
  maxHitpoints: 1e8,
  classId: "warrior",
}));
for (const player of players) ecs.players.set(player.id, player);
const scene: SceneState = {
  id: "benchmark",
  type: "Forest",
  difficulty: "Easy",
  phase: "active",
  ready: [],
  countdownAt: null,
  endsAt: 1e12,
  nextSpawn: 1e12,
  sequence: 160,
  playerCount: 8,
  portals: [],
  damage: [],
  enemies: Array.from({ length: 160 }, (_, i) => ({
    id: i + 1,
    x: 2150 + (i % 16) * 35,
    y: 1050 + Math.floor(i / 16) * 35,
    hitpoints: 1e8,
    maxHitpoints: 1e8,
    angle: 0,
    archetype: (["skeleton", "runner", "brute", "caster"] as const)[i % 4],
  })),
};
ecs.bind(scene);
const states = players.map(() => new SessionState()),
  encoders = states.map((state) => new Encoder(state));
const simulation: number[] = [],
  replication: number[] = [];
let bytes = 0;
let seed = 12345;
const originalRandom = Math.random;
Math.random = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 2 ** 32;
for (let tick = 0; tick < 500; tick++) {
  const now = 10000 + tick * 50;
  const start = performance.now();
  stepCombat(scene, players, now, 0.05);
  const simulated = performance.now();
  const projection = prepareState({
    id: "world",
    name: "Benchmark",
    hostId: "p0",
    players,
    scene,
    serverNow: now,
  });
  for (let client = 0; client < 8; client++) {
    applyState(states[client], projection);
    const patch = encoders[client].encode();
    if (tick >= 100) bytes += patch.byteLength;
    encoders[client].discardChanges();
  }
  if (tick >= 100) {
    simulation.push(simulated - start);
    replication.push(performance.now() - simulated);
  }
}
Math.random = originalRandom;
const summary = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    meanMs: values.reduce((sum, value) => sum + value, 0) / values.length,
    p95Ms: sorted[Math.floor(sorted.length * 0.95)],
    maxMs: sorted.at(-1),
  };
};
console.log(
  JSON.stringify(
    {
      scenario: "8 stationary players, 160 mixed enemies, 20 Hz; 100 warmup and 400 measured ticks",
      simulation: summary(simulation),
      replicationForEightClients: summary(replication),
      totalPatchBytesPerSecond: bytes / (400 * 0.05),
      ecsEntities: ecs.ecs.size,
    },
    null,
    2,
  ),
);
