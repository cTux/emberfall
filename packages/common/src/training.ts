import { TRAINING_ZONES, inTrainingZone } from "./world.ts";
import { tickCompanion, tickPlayerCombat } from "./simulation.ts";
import { damagePerSecond, tickDebuffs } from "./class-combat.ts";
import type { Player } from "./index.ts";
import type { SceneState } from "./scene.ts";

export function tickTraining(
  scene: SceneState | undefined,
  players: Player[],
  now: number,
  dt: number,
) {
  scene ??= {
    id: "lobby-training",
    training: true,
    type: "Forest",
    difficulty: "Easy",
    phase: "active",
    ready: [],
    countdownAt: null,
    endsAt: null,
    portals: [],
    sequence: 7,
    nextSpawn: now + 1000,
    damage: [],
    enemies: [
      { x: TRAINING_ZONES[0].x, y: TRAINING_ZONES[0].y },
      ...[0, 1, 2].flatMap((row) =>
        Array.from({ length: row + 1 }, (_, col) => ({
          x: TRAINING_ZONES[1].x + (col - row / 2) * 40,
          y: TRAINING_ZONES[1].y - 40 + row * 40,
        })),
      ),
    ].map((position, index) => ({
      ...position,
      id: index + 1,
      name: "Training dummy",
      archetype: "skeleton" as const,
      angle: 0,
      hitpoints: 1_000_000_000,
      maxHitpoints: 1_000_000_000,
    })),
  };
  if (now >= scene.nextSpawn) {
    for (const enemy of scene.enemies) enemy.hitpoints = enemy.maxHitpoints!;
    scene.nextSpawn += (Math.floor((now - scene.nextSpawn) / 1000) + 1) * 1000;
  }
  scene.damage = scene.damage.filter((hit) => now - hit.at < 800);
  const lobby = players.filter((player) => !player.scene && player.hitpoints > 0);
  tickDebuffs(scene, lobby, now);
  for (const player of lobby)
    tickCompanion(player, inTrainingZone(player) ? scene : undefined, now, dt);
  tickPlayerCombat(scene, lobby, now, dt);
  for (const player of players) player.dps = damagePerSecond(player, now);
  return scene;
}
