import { performance } from "node:perf_hooks";
import { SnapshotBuffer } from "../packages/client/src/snapshots.ts";
import type { WorldState } from "../packages/common/src/index.ts";

const world: WorldState = {
  id: "benchmark",
  name: "Benchmark",
  hostId: "p",
  serverNow: 10000,
  players: [
    {
      id: "p",
      name: "P",
      x: 2400,
      y: 1280,
      scene: "forest",
      hitpoints: 100,
      maxHitpoints: 100,
      color: 0,
      level: 1,
      experience: 0,
      playtimeSeconds: 0,
      attackAt: 1e9,
    },
  ],
  scene: {
    id: "s",
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: 1e9,
    nextSpawn: 1e9,
    portals: [],
    damage: [],
    sequence: 160,
    enemies: Array.from({ length: 160 }, (_, i) => ({
      id: i + 1,
      x: 2080 + (i % 16) * 40,
      y: 1000 + Math.floor(i / 16) * 40,
      hitpoints: 10,
      angle: 0,
    })),
  },
};
const p = new SnapshotBuffer("p");
p.push(world, 0);
const times: number[] = [];
for (let i = 0; i < 350; i++) {
  const start = performance.now();
  p.render(200 + i * 16);
  if (i >= 50) times.push(performance.now() - start);
}
times.sort((a, b) => a - b);
console.log(
  JSON.stringify({
    enemies: 160,
    samples: times.length,
    medianMs: times[150],
    p95Ms: times[285],
  }),
);
