import { TALENT_MAX_RANK, TALENT_DEFENSIVE_COLUMN } from '../talent-catalog.ts';
import { PASSIVES } from './passive-tuning.ts';
import { game, type createGame } from '../game.ts';
import type { Enemy, Player, SceneState } from '@emberfall/common';
import type { CharacterStats } from '../content/rules.ts';
import { rank, applyTalentAilment, talentArea as area } from '../talent-ailments.ts';
import { TALENT_NAMES } from '../talent-tree.ts';
import { characterStats } from '../equipment.ts';
import { state } from './state.ts';
import { strike, heal, talentVisual } from './effects.ts';

type Game = ReturnType<typeof createGame>;
export function talentIncomingDamage(
  scene: SceneState,
  player: Player,
  amount: number,
  now: number,
  context: Game = game,
) {
  const value = state(player, scene);
  let prevented = 0;

  if (value.guardUntil > now) {
    const reduction = PASSIVES.guardReduction[rank(player, 2, 0) === TALENT_MAX_RANK ? 1 : 0];
    prevented += amount * reduction;
    amount *= 1 - reduction;
    value.guardUntil = 0;
  }

  if (value.wallUntil > now) {
    value.wallPrevented = true;
    const reduction = PASSIVES.wallReduction[value.wallRank === TALENT_MAX_RANK ? 1 : 0];
    prevented += amount * reduction;
    amount *= 1 - reduction;
  }

  if (value.barrierUntil > now && value.barrier > 0) {
    const absorbed = Math.min(value.barrier, amount);
    value.barrier -= absorbed;
    amount -= absorbed;
    prevented += absorbed;
  }

  const retaliation = rank(player, 2, 6);

  if (prevented > 0 && retaliation && now >= value.reprisalAt) {
    value.reprisalAt = now + PASSIVES.reprisalCooldownMs;

    for (const enemy of area(scene, player, PASSIVES.reprisalRadius, player)) {
      strike(
        scene,
        player,
        enemy,
        PASSIVES.reprisalPower[retaliation === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][2][6],
        context,
      );
    }

    talentVisual(scene, player, TALENT_DEFENSIVE_COLUMN, player, now);
  }

  const rebirth = rank(player, 2, 9);

  if (amount > 0) {
    amount = Math.max(1, amount);
  }

  if (
    player.classId === 'druid' &&
    rebirth &&
    amount >= player.hitpoints &&
    now >= (value.rebirthAt ?? 0)
  ) {
    value.rebirthAt = now + PASSIVES.rebirthCooldownMs;
    amount = Math.max(
      0,
      player.hitpoints -
        player.maxHitpoints * PASSIVES.rebirthHealthFraction[rebirth === TALENT_MAX_RANK ? 1 : 0],
    );
    talentVisual(scene, player, TALENT_DEFENSIVE_COLUMN, player, now);
  }

  return amount;
}

export function talentWeaponHit(
  scene: SceneState,
  player: Player,
  enemy: Enemy,
  now: number,
  companion = false,
  stats?: CharacterStats,
  context: Game = game,
) {
  const value = state(player, scene);
  value.stats = stats ?? characterStats(player);
  const guard = rank(player, 2, 0);

  if (
    !companion &&
    enemy.challengedBy === player.id &&
    (enemy.challengedUntil ?? 0) > now &&
    !value.challengeHits?.has(enemy.id)
  ) {
    value.challengeHits ??= new Set();
    value.challengeHits.add(enemy.id);
    strike(
      scene,
      player,
      enemy,
      PASSIVES.challengePower[rank(player, 2, 5) === TALENT_MAX_RANK ? 1 : 0],
      now,
      TALENT_NAMES[player.classId ?? 'warrior'][2][5],
      context,
    );
  }

  if (
    guard &&
    now >= value.guardReadyAt &&
    context.random() < PASSIVES.guardChance[guard === TALENT_MAX_RANK ? 1 : 0]
  ) {
    value.guardUntil = now + PASSIVES.guardLifetimeMs;
    value.guardReadyAt = now + PASSIVES.guardCooldownMs;
  }

  value.hits++;
  const follow = rank(player, 0, 0);

  if (!companion && follow && value.hits % PASSIVES.followEveryHits === 0) {
    for (const other of area(scene, enemy, PASSIVES.followRadius, player)) {
      if (other !== enemy) {
        strike(
          scene,
          player,
          other,
          PASSIVES.followPower[follow === TALENT_MAX_RANK ? 1 : 0],
          now,
          TALENT_NAMES[player.classId ?? 'warrior'][0][0],
          context,
        );
      }
    }
  }

  if ((player.classId ?? 'warrior') === 'druid' && companion) {
    const bond = rank(player, 1, 0);

    if (bond && value.hits % PASSIVES.bondEveryHits === 0) {
      strike(
        scene,
        player,
        enemy,
        PASSIVES.bondPower[bond === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][1][0],
        context,
      );
    }

    const rake = rank(player, 1, 2);

    if (rake && context.random() < PASSIVES.rakeChance[rake === TALENT_MAX_RANK ? 1 : 0]) {
      applyTalentAilment(enemy, player, 'bleed', 1, now, undefined, value.stats);
    }

    const life = rank(player, 1, 8);

    if (life && value.hits % PASSIVES.lifeEveryHits === 0) {
      heal(player, PASSIVES.lifeHealthFraction[life === TALENT_MAX_RANK ? 1 : 0], player, now);
    }

    const shared = rank(player, 1, 6);

    if (
      shared &&
      enemy.debuffs?.some((entry) => {
        return entry.ownerId === player.id && entry.kind === 'roots' && entry.expiresAt > now;
      })
    ) {
      strike(
        scene,
        player,
        enemy,
        PASSIVES.sharedPower[shared === TALENT_MAX_RANK ? 1 : 0],
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][1][6],
        context,
      );
    }

    const instinct = rank(player, 1, 9);

    if (instinct && value.hits % PASSIVES.instinctEveryHits === 0) {
      for (const other of area(scene, enemy, PASSIVES.instinctRadius, player)) {
        if (other !== enemy) {
          strike(
            scene,
            player,
            other,
            PASSIVES.instinctPower[instinct === TALENT_MAX_RANK ? 1 : 0],
            now,
            TALENT_NAMES[player.classId ?? 'warrior'][1][9],
            context,
          );
        }
      }
    }
  }

  if (
    player.classId !== 'warrior' &&
    player.classId !== 'druid' &&
    rank(player, 1, 0) &&
    !companion &&
    context.random() < PASSIVES.weaponAilmentChance[rank(player, 1, 0) === TALENT_MAX_RANK ? 1 : 0]
  ) {
    applyTalentAilment(
      enemy,
      player,
      player.classId === 'mage' ? 'burn' : player.classId === 'druid' ? 'roots' : 'poison',
      1,
      now,
      undefined,
      value.stats,
    );
  }

  if (
    player.classId === 'druid' &&
    rank(player, 2, 0) &&
    value.hits % PASSIVES.druidGuardEveryHits === 0
  ) {
    heal(
      player,
      PASSIVES.druidGuardHealthFraction[rank(player, 2, 0) === TALENT_MAX_RANK ? 1 : 0],
      player,
      now,
    );
  }
}
