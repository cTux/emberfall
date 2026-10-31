import { game, type createGame } from '../game.ts';
import { tickDebuffs, setRewardPlayers } from '../class-combat.ts';
import type { Player, SceneState } from '@emberfall/common';
import { prepareForestTick } from './forest-lifecycle.ts';
import { tickPickups } from './pickups.ts';
import { tickCompanion } from './companion.ts';
import { tickSpawns } from './spawns.ts';
import { tickPlayerCombat } from './player.ts';
import { tickEnemyCombat } from './enemy-combat.ts';

type Game = ReturnType<typeof createGame>;
export function stepCombat(
  scene: SceneState,
  players: Player[],
  now: number,
  dt: number,
  context: Game = game,
  partyPlayers: Player[] = players,
) {
  setRewardPlayers(scene, partyPlayers);
  const ENEMY_STATS = Object.fromEntries(context.registries.enemies.entries());
  const healthScale = prepareForestTick(scene, players, now, context);
  if (healthScale === undefined) {
    return;
  }

  tickPickups(scene, players, now, dt);
  for (const player of players.filter((p) => {
    return p.scene === 'forest' && !p.reconnecting;
  })) {
    tickCompanion(player, scene, now, dt, context);
  }

  if (scene.phase !== 'active') {
    return;
  }

  scene.spawns ??= [];
  scene.projectiles ??= [];
  const alive = players.filter((p) => {
    return p.scene === 'forest' && p.hitpoints > 0 && !p.reconnecting;
  });
  tickSpawns(scene, alive, now, healthScale, ENEMY_STATS, context);
  tickDebuffs(scene, players, now, context);
  tickPlayerCombat(scene, alive, now, dt, context);
  tickEnemyCombat(scene, alive, now, dt, ENEMY_STATS, context);
  if (
    scene.bossId !== undefined &&
    !scene.enemies.some((e) => {
      return e.id === scene.bossId;
    }) &&
    !scene.spawns.some((e) => {
      return e.id === scene.bossId;
    })
  ) {
    scene.phase = 'ended';
    scene.enemies = [];
    scene.spawns = [];
    scene.projectiles = [];
    scene.playerShots = [];
    scene.portals = players
      .filter((p) => {
        return p.scene === 'forest';
      })
      .map((p) => {
        return { x: p.x, y: p.y + 15 };
      });
  }
}
