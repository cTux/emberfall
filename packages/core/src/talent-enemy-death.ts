import { rank } from './rank.ts';
import { talentArea } from './talent-area.ts';
import { TALENT_AILMENTS } from './talent-ailment-tuning.ts';
import { applyTalentAilment } from './apply-talent-ailment.ts';
import type { SceneState, Player, Enemy } from '@emberfall/core/contracts';
import type { CharacterStats } from './content/rules.ts';
import { TALENT_MAX_RANK } from './talent-catalog.ts';

export function talentEnemyDeath(
  scene: SceneState,
  player: Player,
  enemy: Enemy,
  now: number,
  stats?: CharacterStats,
) {
  if (player.classId === 'druid') {
    return;
  }

  const spread = rank(player, 1, 6);
  const wounds = enemy.debuffs?.some((entry) => {
    return (
      entry.ownerId === player.id &&
      entry.expiresAt > now &&
      ['bleed', 'poison', 'burn'].includes(entry.kind)
    );
  });

  if (spread && wounds) {
    const kind =
      player.classId === 'warrior' || player.classId === 'druid'
        ? 'bleed'
        : player.classId === 'ranger'
          ? 'poison'
          : 'burn';

    for (const other of talentArea(scene, enemy, TALENT_AILMENTS.spreadRadius, player).slice(
      0,
      TALENT_AILMENTS.spreadTargets[spread === TALENT_MAX_RANK ? 1 : 0],
    )) {
      applyTalentAilment(other, player, kind, spread, now, undefined, stats);
    }
  }
}
