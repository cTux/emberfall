import { createTrainingScene } from './create-training-scene.ts';
import { type createGame, game } from './game.ts';
import type { SceneState, Player } from '@emberfall/common';

// Seven dummy IDs occupy the initial training layout; subsequent transient IDs start after them.
import { TRAINING_DEFINITION } from './definitions/encounters/training.ts';
import { TRANSIENT_EFFECTS } from './definitions/effects/transient.ts';
import { tickDebuffs, damagePerSecond } from './class-combat.ts';
import { tickCompanion, tickPlayerCombat } from './simulation.ts';
import { inTrainingZone } from './world.ts';
import { refreshCombatTotals } from './combat/meters.ts';

type Game = ReturnType<typeof createGame>;

export function tickTraining(
  scene: SceneState | undefined,
  players: Player[],
  now: number,
  dt: number,
  context: Game = game,
) {
  scene ??= createTrainingScene(now);

  if (now >= scene.nextSpawn) {
    for (const enemy of scene.enemies) {
      enemy.hitpoints = enemy.maxHitpoints!;
    }

    scene.nextSpawn +=
      (Math.floor((now - scene.nextSpawn) / TRAINING_DEFINITION.refreshMs) + 1) *
      TRAINING_DEFINITION.refreshMs;
  }

  scene.damage = scene.damage.filter((hit) => {
    return now - hit.at < TRANSIENT_EFFECTS.damage.lifetimeMs;
  });
  const lobby = players.filter((player) => {
    return !player.scene && player.hitpoints > 0 && !player.reconnecting;
  });
  tickDebuffs(scene, lobby, now, context);

  for (const player of lobby) {
    tickCompanion(player, inTrainingZone(player) ? scene : undefined, now, dt, context);
  }

  tickPlayerCombat(scene, lobby, now, dt, context);

  for (const player of players) {
    player.dps = damagePerSecond(player, now);
    refreshCombatTotals(player, now);
  }

  return scene;
}
