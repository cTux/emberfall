import type { Player, ClientMessage } from '@emberfall/common';
import { useState } from 'react';
import { Menu, MenuItem } from '@mui/material';
import { TalentIcon } from './talent-icons';
import {
  TALENT_TREE,
  isTalentLearned,
  talentAbility,
  talentCooldownMs,
  equippedTalent,
} from '@emberfall/core';
import { characterStats } from '@emberfall/core';
import { ActionBar } from '@emberfall/ui';
import { spellSrc } from './class-art';
import { classDetails } from './class-details';
import type { Preferences } from './preferences';

export function WeaponActionBar({
  player,
  now,
  preferences,
  onCast,
  send,
}: {
  player: Player;
  onCast: (slot: number) => void;
  send: (message: ClientMessage) => void;
  now: number;
  preferences: Pick<Preferences, 'autoAttack' | 'autoTarget'>;
}) {
  const stats = characterStats(player);
  const [picker, setPicker] = useState<{ slot: number; anchor: HTMLElement } | null>(null);
  const classId = player.classId ?? 'warrior';
  return (
    <div className='action-bar'>
      <ActionBar
        onChoose={(slot, anchor) => setPicker({ slot, anchor })}
        abilities={[0, 1, 2, 3].map((slot) => {
          const node = equippedTalent(player, slot);
          const ability = node?.slot === undefined ? undefined : talentAbility(player, node.slot);
          return ability && node && isTalentLearned(player, node.id)
            ? {
                name: ability.name!,
                icon: <TalentIcon classId={classId} index={node.column * 10 + node.row} />,
                cooldownMs: talentCooldownMs(player, node.slot!),
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
      <Menu anchorEl={picker?.anchor} open={!!picker} onClose={() => setPicker(null)}>
        <MenuItem
          onClick={() => {
            if (picker) send({ type: 'equipTalent', slot: picker.slot, nodeId: null });
            setPicker(null);
          }}
        >
          Clear slot
        </MenuItem>
        {TALENT_TREE.filter(
          (node) =>
            node.classId === classId && node.kind === 'ability' && isTalentLearned(player, node.id),
        ).map((node) => (
          <MenuItem
            key={node.id}
            onClick={() => {
              if (picker) send({ type: 'equipTalent', slot: picker.slot, nodeId: node.id });
              setPicker(null);
            }}
          >
            {node.name}
          </MenuItem>
        ))}
      </Menu>
    </div>
  );
}
