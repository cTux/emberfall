import type { Player } from '@emberfall/common';
import { characterStats } from '@emberfall/core';
import { ActionBar } from '@emberfall/ui';
import { spellSrc } from './combat-assets';
import { classDetails } from './class-details';
import type { Preferences } from './preferences';

export function WeaponActionBar({
  player,
  now,
  preferences,
}: {
  player: Player;
  now: number;
  preferences: Pick<Preferences, 'autoAttack' | 'autoTarget'>;
}) {
  const stats = characterStats(player);
  const classId = player.classId ?? 'warrior';
  return (
    <div className='action-bar'>
      <ActionBar
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
