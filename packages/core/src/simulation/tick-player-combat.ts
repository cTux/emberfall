import type { Game } from './game.ts';
import { playerAimAngle } from './player-aim-angle.ts';
import { castInputs } from './cast-inputs.ts';
import type { SceneState, Player } from '@emberfall/common';
import { game } from '../game.ts';
import { tickTalentEffects } from '../talent-effects.ts';
import { nearestSpellTarget, fireClassAttack, tickPlayerShots } from '../class-combat.ts';
import { inTrainingZone } from '../world.ts';
import { smoothAttackAngle } from './aim.ts';
import { swordHits, slash } from './melee.ts';

// Buffer two simulation ticks of early requests to tolerate normal command/tick phase differences.

export function tickPlayerCombat(
  scene: SceneState,
  alive: Player[],
  now: number,
  dt: number,
  context: Game = game,
) {
  tickTalentEffects(scene, alive, now);

  for (const player of alive) {
    const stats = context.rules.characterStats(player);
    player.attackTargetId =
      player.autoTarget === false
        ? undefined
        : nearestSpellTarget(player, scene.enemies, stats.range)?.id;
    const ability = context.registries.abilities.require(
      context.registries.classes.require(player.classId ?? 'warrior').attack,
    );

    if (
      !stats.hasWeapon ||
      !Number.isFinite(stats.attackIntervalMs) ||
      (scene.training && !inTrainingZone(player))
    ) {
      player.attackAt = undefined;
      continue;
    }

    player.attackAngle = smoothAttackAngle(
      player.attackAngle,
      playerAimAngle(player, scene.enemies, context),
      dt,
      ability.aimSmoothingSeconds,
    );
    const attacking = player.autoAttack !== false;

    if (
      attacking &&
      (ability.kind === 'slash' ||
        player.autoTarget === false ||
        nearestSpellTarget(player, scene.enemies, stats.range)) &&
      (player.attackAt === undefined || now - player.attackAt >= stats.attackIntervalMs)
    ) {
      player.attackAt =
        ability.kind === 'slash'
          ? now - ((now - (player.attackAt ?? now)) % stats.attackIntervalMs)
          : now;
      player.attackId = undefined;
    }

    if (player.attackAt === undefined) {
      continue;
    }

    const age = now - player.attackAt;

    if (age < 0 || age >= ability.durationMs) {
      continue;
    }

    let swing = swordHits.get(player);
    const freshSwing = !swing || swing.at !== player.attackAt || swing.sceneId !== scene.id;

    if (freshSwing) {
      swing = { sceneId: scene.id, at: player.attackAt, enemies: new Set() };
      swordHits.set(player, swing);
    }

    if (ability.kind !== 'slash') {
      if (freshSwing) {
        const request = castInputs.get(player);
        fireClassAttack(
          scene,
          request && request.id === player.attackId
            ? {
                ...player,
                autoTarget: request.autoTarget,
                aimX: request.aimX,
                aimY: request.aimY,
              }
            : player,
          now,
          context,
        );
        castInputs.delete(player);
      }

      continue;
    }

    slash(scene, player, player, now, context);

    if (!scene.training) {
      scene.enemies = scene.enemies.filter((e) => {
        return e.hitpoints > 0;
      });
    }
  }

  tickPlayerShots(scene, alive, now, dt, context);

  if (!scene.training) {
    scene.enemies = scene.enemies.filter((e) => {
      return e.hitpoints > 0;
    });
  }
}
