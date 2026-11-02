import { rank } from './rank.ts';
import { TALENT_AILMENTS } from './talent-ailment-tuning.ts';
import type { Player, DebuffKind } from '@emberfall/core/contracts';
import { TALENT_MAX_RANK } from './talent-catalog.ts';

/** Extra bleed chance is additive with the weapon's existing roll. */
export function talentAilmentChance(player: Player, kind: DebuffKind) {
  if (kind !== 'bleed' || (player.classId ?? 'warrior') !== 'warrior') {
    return 0;
  }

  const learned = rank(player, 1, 0);

  return learned === TALENT_MAX_RANK
    ? TALENT_AILMENTS.bleedChance[1]
    : learned === 1
      ? TALENT_AILMENTS.bleedChance[0]
      : 0;
}
