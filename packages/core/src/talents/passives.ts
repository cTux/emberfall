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
    const reduction = rank(player, 2, 0) === 2 ? 0.6 : 0.4;
    prevented += amount * reduction;
    amount *= 1 - reduction;
    value.guardUntil = 0;
  }
  if (value.wallUntil > now) {
    value.wallPrevented = true;
    const reduction = value.wallRank === 2 ? 0.75 : 0.6;
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
    value.reprisalAt = now + 2000;
    for (const enemy of area(scene, player, 130, player))
      strike(
        scene,
        player,
        enemy,
        retaliation === 2 ? 1 : 0.6,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][2][6],
        context,
      );
    talentVisual(scene, player, 2, player, now);
  }
  const rebirth = rank(player, 2, 9);
  if (amount > 0) amount = Math.max(1, amount);
  if (
    player.classId === 'druid' &&
    rebirth &&
    amount >= player.hitpoints &&
    now >= (value.rebirthAt ?? 0)
  ) {
    value.rebirthAt = now + 60000;
    amount = Math.max(0, player.hitpoints - player.maxHitpoints * (rebirth === 2 ? 0.25 : 0.15));
    talentVisual(scene, player, 2, player, now);
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
      rank(player, 2, 5) === 2 ? 1.2 : 0.5,
      now,
      TALENT_NAMES[player.classId ?? 'warrior'][2][5],
      context,
    );
  }
  if (guard && now >= value.guardReadyAt && context.random() < (guard === 2 ? 0.25 : 0.15)) {
    value.guardUntil = now + 3000;
    value.guardReadyAt = now + 4000;
  }
  value.hits++;
  const follow = rank(player, 0, 0);
  if (!companion && follow && value.hits % 3 === 0)
    for (const other of area(scene, enemy, 100, player))
      if (other !== enemy)
        strike(
          scene,
          player,
          other,
          follow === 2 ? 0.7 : 0.4,
          now,
          TALENT_NAMES[player.classId ?? 'warrior'][0][0],
          context,
        );
  if ((player.classId ?? 'warrior') === 'druid' && companion) {
    const bond = rank(player, 1, 0);
    if (bond && value.hits % 3 === 0)
      strike(
        scene,
        player,
        enemy,
        bond === 2 ? 0.7 : 0.4,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][1][0],
        context,
      );
    const rake = rank(player, 1, 2);
    if (rake && context.random() < (rake === 2 ? 0.45 : 0.25))
      applyTalentAilment(enemy, player, 'bleed', 1, now, undefined, value.stats);
    const life = rank(player, 1, 8);
    if (life && value.hits % 5 === 0) heal(player, life === 2 ? 0.04 : 0.02);
    const shared = rank(player, 1, 6);
    if (
      shared &&
      enemy.debuffs?.some(
        (entry) => entry.ownerId === player.id && entry.kind === 'roots' && entry.expiresAt > now,
      )
    )
      strike(
        scene,
        player,
        enemy,
        shared === 2 ? 0.6 : 0.3,
        now,
        TALENT_NAMES[player.classId ?? 'warrior'][1][6],
        context,
      );
    const instinct = rank(player, 1, 9);
    if (instinct && value.hits % 5 === 0)
      for (const other of area(scene, enemy, 160, player))
        if (other !== enemy)
          strike(
            scene,
            player,
            other,
            instinct === 2 ? 1 : 0.6,
            now,
            TALENT_NAMES[player.classId ?? 'warrior'][1][9],
            context,
          );
  }
  if (
    player.classId !== 'warrior' &&
    player.classId !== 'druid' &&
    rank(player, 1, 0) &&
    !companion &&
    context.random() < (rank(player, 1, 0) === 2 ? 0.35 : 0.2)
  )
    applyTalentAilment(
      enemy,
      player,
      player.classId === 'mage' ? 'burn' : player.classId === 'druid' ? 'roots' : 'poison',
      1,
      now,
      undefined,
      value.stats,
    );
  if (player.classId === 'druid' && rank(player, 2, 0) && value.hits % 5 === 0)
    heal(player, rank(player, 2, 0) === 2 ? 0.04 : 0.02);
}
