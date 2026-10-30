import type { Player, ClientMessage } from '@emberfall/common';
import { useEffect, useRef, useState } from 'react';
import { Menu, MenuItem, Tooltip } from '@mui/material';
import { TalentIcon } from './talent-icons';
import {
  TALENT_TREE,
  inTrainingZone,
  isTalentLearned,
  talentAbility,
  talentDescription,
  talentCooldownMs,
  equippedTalent,
} from '@emberfall/core';
import { characterStats } from '@emberfall/core';
import { ActionBar } from '@emberfall/ui';
import { clientAsset } from './urls';
import { spellSrc } from './class-art';
import { classDetails } from './class-details';
import type { Preferences } from './preferences';

export function WeaponActionBar({
  player,
  now,
  preferences,
  onCast,
  send,
  setPreferences,
  canAutoCast,
}: {
  player: Player;
  onCast: (slot: number, automatic?: boolean) => void;
  send: (message: ClientMessage) => void;
  now: number;
  preferences: Preferences;
  setPreferences: import('react').Dispatch<import('react').SetStateAction<Preferences>>;
  canAutoCast: boolean;
}) {
  const stats = characterStats(player);
  const [picker, setPicker] = useState<{ slot: number; anchor: HTMLElement } | null>(null);
  const lastRequest = useRef(0);
  useEffect(() => {
    if (
      !canAutoCast ||
      picker ||
      !preferences.autoAttack ||
      player.hitpoints <= 0 ||
      !stats.hasWeapon ||
      document.hidden ||
      (!player.scene && !inTrainingZone(player)) ||
      now - lastRequest.current < 250
    )
      return;
    lastRequest.current = now;
    for (let slot = 0; slot < 4; slot++) {
      const node = equippedTalent(player, slot);
      const ability = node?.slot === undefined ? undefined : talentAbility(player, node.slot);
      if (
        node &&
        ability &&
        isTalentLearned(player, node.id) &&
        preferences.autoCastAbilities?.includes(node.id) &&
        now >= (player.talentCooldowns?.[ability.id] ?? 0)
      )
        onCast(slot, true);
    }
  }, [canAutoCast, picker, preferences, player, stats.hasWeapon, now, onCast]);
  const tileStyle = {
    p: 0,
    minHeight: 0,
    width: { xs: 44, sm: 52 },
    height: { xs: 44, sm: 52 },
    '& > img': { width: '100%', height: '100%' },
  };
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
                description: talentDescription(node),
                icon: <TalentIcon classId={classId} index={node.column * 10 + node.row} />,
                cooldownMs: talentCooldownMs(player, node.slot!),
                remainingMs: (player.talentCooldowns?.[ability.id] ?? 0) - now,
                autoCast:
                  preferences.autoAttack && !!preferences.autoCastAbilities?.includes(node.id),
                onToggleAutoCast: () =>
                  setPreferences((value) => ({
                    ...value,
                    autoCastAbilities: value.autoCastAbilities?.includes(node.id)
                      ? value.autoCastAbilities.filter((id) => id !== node.id)
                      : [...(value.autoCastAbilities ?? []), node.id],
                  })),
              }
            : undefined;
        })}
        autoFire={preferences.autoAttack}
        autoTarget={preferences.autoTarget}
        baseAbility={
          stats.hasWeapon
            ? {
                onToggleAutoCast: () =>
                  setPreferences((value) => ({ ...value, autoAttack: !value.autoAttack })),
                name: classDetails[classId].spell,
                description: classDetails[classId].spellDescription,
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
      <Menu
        anchorEl={picker?.anchor}
        open={!!picker}
        onClose={() => setPicker(null)}
        slotProps={{
          list: { sx: { display: 'flex', flexWrap: 'wrap', gap: 1, p: 1, maxWidth: 300 } },
        }}
      >
        <Tooltip title='Clear slot'>
          <MenuItem
            aria-label='Clear slot'
            sx={tileStyle}
            onClick={() => {
              if (picker) send({ type: 'equipTalent', slot: picker.slot, nodeId: null });
              setPicker(null);
            }}
          >
            <img src={clientAsset('/assets/action-bar/clear.png')} alt='' draggable={false} />
          </MenuItem>
        </Tooltip>
        {TALENT_TREE.filter(
          (node) =>
            node.classId === classId && node.kind === 'ability' && isTalentLearned(player, node.id),
        ).map((node) => (
          <Tooltip key={node.id} title={node.name}>
            <MenuItem
              aria-label={node.name}
              sx={tileStyle}
              onClick={() => {
                if (picker) send({ type: 'equipTalent', slot: picker.slot, nodeId: node.id });
                setPicker(null);
              }}
            >
              <TalentIcon classId={classId} index={node.column * 10 + node.row} />
            </MenuItem>
          </Tooltip>
        ))}
      </Menu>
    </div>
  );
}
