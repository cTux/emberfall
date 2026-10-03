import { TRANSIENT_EFFECTS } from "./definitions/effects/transient.ts";
import { TRAINING_DEFINITION } from "./definitions/encounters/training.ts";
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
  scene ??= createTrainingScene(now);
  if (now >= scene.nextSpawn) {
    for (const enemy of scene.enemies) enemy.hitpoints = enemy.maxHitpoints!;
    scene.nextSpawn +=
      (Math.floor((now - scene.nextSpawn) / TRAINING_DEFINITION.refreshMs) + 1) *
      TRAINING_DEFINITION.refreshMs;
  }
  scene.damage = scene.damage.filter((hit) => now - hit.at < TRANSIENT_EFFECTS.damage.lifetimeMs);
  const lobby = players.filter((player) => !player.scene && player.hitpoints > 0);
  tickDebuffs(scene, lobby, now);
  for (const player of lobby)
    tickCompanion(player, inTrainingZone(player) ? scene : undefined, now, dt);
  tickPlayerCombat(scene, lobby, now, dt);
  for (const player of players) player.dps = damagePerSecond(player, now);
  return scene;
}

export function createTrainingScene(now: number): SceneState {
  return {
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
    nextSpawn: now + TRAINING_DEFINITION.refreshMs,
    damage: [],
    enemies: [
      { x: TRAINING_ZONES[0].x, y: TRAINING_ZONES[0].y },
      ...Array.from({ length: TRAINING_DEFINITION.triangleRows }, (_, row) => row).flatMap((row) =>
        Array.from({ length: row + 1 }, (_, col) => ({
          x: TRAINING_ZONES[1].x + (col - row / 2) * TRAINING_DEFINITION.spacing,
          y: TRAINING_ZONES[1].y - TRAINING_DEFINITION.spacing + row * TRAINING_DEFINITION.spacing,
        })),
      ),
    ].map((position, index) => ({
      ...position,
      id: index + 1,
      name: TRAINING_DEFINITION.dummyName,
      archetype: "skeleton" as const,
      angle: 0,
      hitpoints: TRAINING_DEFINITION.hitpoints,
      maxHitpoints: TRAINING_DEFINITION.hitpoints,
    })),
  } satisfies SceneState;
}
