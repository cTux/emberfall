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
  characterStats,
} from '@emberfall/core';
import { ActionBar } from '@emberfall/ui';
import { clientAsset } from './urls';
import { spellSrc } from './class-art';
import { classDetails } from './class-details';
import type { Preferences } from './preferences';

// Preserve four assignable ability slots, checking auto-casts four times per second rather than per frame.
const ACTION_BAR = { slotCount: 4, autoCastIntervalMs: 250, talentRowsPerColumn: 10 };

// The wire slot IDs are the four zero-based action-bar positions.
const ABILITY_SLOTS = [0, 1, 2, 3];

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
      now - lastRequest.current < ACTION_BAR.autoCastIntervalMs
    ) {
      return;
    }

    lastRequest.current = now;

    for (let slot = 0; slot < ACTION_BAR.slotCount; slot++) {
      const node = equippedTalent(player, slot);
      const ability = node?.slot === undefined ? undefined : talentAbility(player, node.slot);

      if (
        node &&
        ability &&
        isTalentLearned(player, node.id) &&
        preferences.autoCastAbilities?.includes(node.id) &&
        now >= (player.talentCooldowns?.[ability.id] ?? 0)
      ) {
        onCast(slot, true);
      }
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
        onChoose={(slot, anchor) => {
          return setPicker({ slot, anchor });
        }}
        abilities={ABILITY_SLOTS.map((slot) => {
          const node = equippedTalent(player, slot);
          const ability = node?.slot === undefined ? undefined : talentAbility(player, node.slot);

          return ability && node && isTalentLearned(player, node.id)
            ? {
                name: ability.name!,
                description: talentDescription(node),
                icon: (
                  <TalentIcon
                    classId={classId}
                    index={node.column * ACTION_BAR.talentRowsPerColumn + node.row}
                  />
                ),
                cooldownMs: talentCooldownMs(player, node.slot!),
                remainingMs: (player.talentCooldowns?.[ability.id] ?? 0) - now,
                autoCast:
                  preferences.autoAttack && !!preferences.autoCastAbilities?.includes(node.id),
                onToggleAutoCast: () => {
                  return setPreferences((value) => {
                    return {
                      ...value,
                      autoCastAbilities: value.autoCastAbilities?.includes(node.id)
                        ? value.autoCastAbilities.filter((id) => {
                            return id !== node.id;
                          })
                        : [...(value.autoCastAbilities ?? []), node.id],
                    };
                  });
                },
              }
            : undefined;
        })}
        autoFire={preferences.autoAttack}
        autoTarget={preferences.autoTarget}
        baseAbility={
          stats.hasWeapon
            ? {
                onToggleAutoCast: () => {
                  return setPreferences((value) => {
                    return { ...value, autoAttack: !value.autoAttack };
                  });
                },
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
        onClose={() => {
          return setPicker(null);
        }}
        slotProps={{
          list: { sx: { display: 'flex', flexWrap: 'wrap', gap: 1, p: 1, maxWidth: 300 } },
        }}
      >
        <Tooltip title='Clear slot'>
          <MenuItem
            aria-label='Clear slot'
            sx={tileStyle}
            onClick={() => {
              if (picker) {
                send({ type: 'equipTalent', slot: picker.slot, nodeId: null });
              }

              setPicker(null);
            }}
          >
            <img src={clientAsset('/assets/action-bar/clear.png')} alt='' draggable={false} />
          </MenuItem>
        </Tooltip>
        {TALENT_TREE.filter((node) => {
          return (
            node.classId === classId && node.kind === 'ability' && isTalentLearned(player, node.id)
          );
        }).map((node) => {
          return (
            <Tooltip key={node.id} title={node.name}>
              <MenuItem
                aria-label={node.name}
                sx={tileStyle}
                onClick={() => {
                  if (picker) {
                    send({ type: 'equipTalent', slot: picker.slot, nodeId: node.id });
                  }

                  setPicker(null);
                }}
              >
                <TalentIcon
                  classId={classId}
                  index={node.column * ACTION_BAR.talentRowsPerColumn + node.row}
                />
              </MenuItem>
            </Tooltip>
          );
        })}
      </Menu>
    </div>
  );
}
