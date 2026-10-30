import { game, type createGame } from '../game.ts';
import { shiftTalentEffects } from '../talent-effects.ts';
import { ENEMY_RULES } from '../definitions/entities/enemies.ts';
import { hasLivingScenePlayers } from '@emberfall/common';
import { enemyMaxHealth } from '../enemies.ts';
import type { Player, SceneState } from '@emberfall/common';

type Game = ReturnType<typeof createGame>;
export function prepareForestTick(
  scene: SceneState,
  players: Player[],
  now: number,
  context: Game = game,
) {
  const playerCount = players.filter((p) => p.scene === 'forest').length;
  const additionalPlayers = Math.max(0, playerCount - 1);
  const healthScale = ENEMY_RULES.healthPerMember ** additionalPlayers;
  const healthRatio =
    healthScale / ENEMY_RULES.healthPerMember ** Math.max(0, (scene.playerCount ?? 1) - 1);
  if (healthRatio !== 1) {
    for (const enemy of [...scene.enemies, ...(scene.spawns ?? [])]) {
      enemy.maxHitpoints = enemyMaxHealth(enemy, scene.difficulty, context) * healthRatio;
      enemy.hitpoints *= healthRatio;
    }
  }
  scene.playerCount = playerCount;
  if (!hasLivingScenePlayers(players)) {
    scene.pausedAt ??= now;
    return;
  }
  if (scene.pausedAt !== undefined) {
    const delay = Math.max(0, now - scene.pausedAt);
    shiftTalentEffects(scene, players, delay);
    // Keep every combat deadline's remaining duration when the scene resumes.
    const keys = [
      'at',
      'endsAt',
      'nextSpawn',
      'warnedAt',
      'spawnsAt',
      'expiresAt',
      'nextTick',
      'startedAt',
      'cooldownUntil',
      'attackAt',
      'hurtAt',
      'resurrectAt',
      'controlledUntil',
      'challengedUntil',
    ] as const;
    const shift = (value: Partial<Record<(typeof keys)[number], number | null>>) => {
      for (const key of keys) if (typeof value[key] === 'number') value[key] += delay;
    };
    shift(scene);
    for (const enemy of [...scene.enemies, ...(scene.spawns ?? [])]) {
      shift(enemy);
      if (enemy.attack) shift(enemy.attack);
      for (const debuff of enemy.debuffs ?? []) shift(debuff);
    }
    for (const event of [
      ...scene.damage,
      ...(scene.drops ?? []),
      ...(scene.projectiles ?? []),
      ...(scene.explosions ?? []),
    ])
      shift(event);
    for (const player of players.filter((p) => p.scene === 'forest' && p.hitpoints <= 0)) {
      // New arrivals already use the current server clock.
      shift(player);
      if (player.bear) shift(player.bear);
    }
    scene.pausedAt = undefined;
  }
  return healthScale;
}
