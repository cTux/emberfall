import type { Player } from '@emberfall/common';
import { characterStats } from '@emberfall/common';
import { ActionBar } from '@emberfall/ui';
import { spellSrc } from './combat-assets';
import { classDetails } from './class-details';

export function WeaponActionBar({ player, now }: { player: Player; now: number }) {
  const stats = characterStats(player);
  const classId = player.classId ?? 'warrior';
  return (
    <div className='action-bar'>
      <ActionBar
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
