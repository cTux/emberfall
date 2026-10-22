import type { Player } from '@emberfall/common';
import { TalentIcon, talentIconIndex } from './Talents';
import { TALENT_TREE, isTalentLearned, talentAbility, talentCooldownMs } from '@emberfall/core';
import { characterStats } from '@emberfall/core';
import { ActionBar } from '@emberfall/ui';
import { spellSrc } from './combat-assets';
import { classDetails } from './class-details';
import type { Preferences } from './preferences';

export function WeaponActionBar({
  player,
  now,
  preferences,
  onCast,
}: {
  player: Player;
  onCast: (slot: number) => void;
  now: number;
  preferences: Pick<Preferences, 'autoAttack' | 'autoTarget'>;
}) {
  const stats = characterStats(player);
  const classId = player.classId ?? 'warrior';
  return (
    <div className='action-bar'>
      <ActionBar
        abilities={[0, 1, 2, 3].map((slot) => {
          const node = TALENT_TREE.find((entry) => entry.slot === slot)!;
          const ability = talentAbility(player, slot);
          return ability && isTalentLearned(player, node.id)
            ? {
                name: ability.name!,
                icon: <TalentIcon index={talentIconIndex(classId, slot)} />,
                cooldownMs: talentCooldownMs(player, slot),
                remainingMs: (player.talentCooldowns?.[ability.id] ?? 0) - now,
                onCast: () => onCast(slot),
              }
            : undefined;
        })}
        autoFire={preferences.autoAttack}
        autoTarget={preferences.autoTarget}
        baseAbility={
          stats.hasWeapon
            ? {
                name: classDetails[classId].spell,
                icon: <img src={spellSrc(classId)} alt='' draggable={false} />,
                cooldownMs: stats.attackIntervalMs,
                remainingMs:
                  player.attackAt === undefined
                    ? 0
                    : player.attackAt + stats.attackIntervalMs - now,
              }
            : undefined
        }
      />
    </div>
  );
}
