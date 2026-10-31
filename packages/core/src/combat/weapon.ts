import { game, type createGame } from '../game.ts';
type Game = ReturnType<typeof createGame>;
import type { SceneState, Enemy, Player, DebuffKind } from '@emberfall/common';
import { characterStats } from '../equipment.ts';
import type { CharacterStats } from '../content/rules.ts';
import { isChanced } from '../utils/isChanced.ts';
import { hitEnemy } from './damage.ts';
import { talentWeaponHit } from '../talent-effects.ts';

/** Called only by authoritative hit resolution, never by cast prediction. */
export function hitWithWeapon(
  scene: SceneState,
  enemy: Enemy,
  owner: Player,
  now: number,
  ailment?: DebuffKind,
  powerScale = 1,
  stats: CharacterStats = characterStats(owner),
  companion = false,
  context: Game = game,
) {
  if (enemy.hitpoints <= 0) {
    return;
  }

  if (!stats.hasWeapon) {
    return;
  }

  const attacks =
    !companion && context.registries.classes.require(owner.classId ?? 'warrior').art === 'warrior'
      ? 1 + stats.bonuses.additionalAttack
      : 1;
  for (let attack = 0; attack < attacks && enemy.hitpoints > 0; attack++) {
    const critical = isChanced(stats.criticalChance * 100, context.random);
    hitEnemy(
      scene,
      enemy,
      stats.power * powerScale * (critical ? stats.criticalMultiplier : 1),
      owner,
      now,
      ailment,
      stats.damageType,
      critical,
      companion
        ? 'Bear'
        : (context.registries.classes.get(owner.classId ?? 'warrior')?.details?.spell ?? 'Attack'),
      stats,
      context,
    );
    talentWeaponHit(scene, owner, enemy, now, companion, stats, context);
  }
}
