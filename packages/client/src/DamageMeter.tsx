import { useState, type CSSProperties } from 'react';
import { useDraggable } from '@emberfall/ui';
import { ButtonBase, IconButton, Menu, MenuItem } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import { faBars } from '@fortawesome/free-solid-svg-icons/faBars';
import { PERCENT, type Player } from '@emberfall/common';
import { TALENT_TREE } from '@emberfall/core';
import { classSprite, spellSrc, statusSrc } from './class-art';
import { TalentIcon } from './talent-icons';
import { clientAsset } from './urls';

const classColors: Record<string, string> = {
  warrior: '#c79c6e',
  ranger: '#abd473',
  mage: '#69ccf0',
  druid: '#ff7d0a',
};
const number = (value: number) => {
  return value.toLocaleString('en', { maximumFractionDigits: 1 });
};

const meterModes = {
  damage: 'Damage done',
  healing: 'Healing done',
  received: 'Damage received',
} as const;
type MeterMode = keyof typeof meterModes;

function meterValues(player: Player, mode: MeterMode) {
  if (mode === 'damage') {
    return { total: player.damageMeter?.total ?? 0, perSecond: player.dps ?? 0 };
  }

  const meter = mode === 'healing' ? player.healingMeter : player.receivedMeter;

  return { total: meter?.total ?? 0, perSecond: meter?.perSecond ?? 0 };
}

export function DamageMeter({ players, playerId }: { players: Player[]; playerId: string }) {
  const [selectedId, select] = useState<string | null>(null);
  const [mode, setMode] = useState<MeterMode>('damage');
  const [menu, setMenu] = useState<{ top: number; left: number } | null>(null);
  const { ref, style, handleProps } = useDraggable('panel.dps');
  const me = players.find((player) => {
    return player.id === playerId;
  });
  const party = players.filter((player) => {
    return player.id === playerId || (!!me?.partyId && player.partyId === me.partyId);
  });
  const selected = party.find((player) => {
    return mode === 'damage' && player.id === selectedId;
  });
  const total = party.reduce((sum, player) => {
    return sum + meterValues(player, mode).total;
  }, 0);
  const rows = selected
    ? Object.entries(selected.damageMeter?.abilities ?? {}).map(([name, value]) => {
        return {
          id: name,
          name,
          damage: value.damage,
          dps: value.dps,
          classId: selected.classId,
        };
      })
    : party.map((player) => {
        return {
          id: player.id,
          name: player.name,
          damage: meterValues(player, mode).total,
          dps: meterValues(player, mode).perSecond,
          classId: player.classId,
        };
      });
  rows.sort((a, b) => {
    return b.damage - a.damage || a.name.localeCompare(b.name);
  });
  const denominator = selected ? (selected.damageMeter?.total ?? 0) : total;

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Right-click is a shortcut for the keyboard-accessible meter menu button.
    <aside
      className='dps-meter'
      aria-label='Damage per second'
      ref={ref}
      style={style}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setMenu({ top: event.clientY, left: event.clientX });
      }}
      onPointerDown={(event) => {
        return event.stopPropagation();
      }}
    >
      <header {...handleProps}>
        <strong>{selected ? `${selected.name} — Abilities` : meterModes[mode]}</strong>
        <IconButton
          size='small'
          aria-label='Choose meter type'
          aria-haspopup='menu'
          aria-expanded={!!menu}
          onClick={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            setMenu({ top: box.bottom, left: box.left });
          }}
        >
          <FontAwesomeIcon icon={faBars} />
        </IconButton>
        {selected && (
          <IconButton
            size='small'
            onClick={() => {
              return select(null);
            }}
            aria-label='Back to party'
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </IconButton>
        )}
      </header>
      <div className='damage-meter-rows'>
        {rows.map((row, index) => {
          const percent = denominator > 0 ? (row.damage / denominator) * PERCENT : 0;
          const classId = row.classId ?? 'warrior';
          const talent = selected
            ? TALENT_TREE.find((node) => {
                return node.classId === classId && node.name === row.name;
              })
            : undefined;
          const ailment = row.name.toLowerCase();
          const content = (
            <>
              <span className='damage-meter-bar' style={{ width: `${percent}%` }} />
              <span className='damage-meter-icon' aria-hidden='true'>
                {talent ? (
                  <TalentIcon classId={classId} index={talent.column * 10 + talent.row} />
                ) : (
                  <img
                    style={
                      selected && row.name === 'Bear'
                        ? { width: '400%', height: '200%' }
                        : undefined
                    }
                    src={
                      !selected
                        ? classSprite(classId)
                        : ailment === 'bleed' || ailment === 'burn' || ailment === 'poison'
                          ? statusSrc(ailment)
                          : row.name === 'Bear'
                            ? clientAsset('/assets/wardrobe-style/bear-cub.png')
                            : spellSrc(classId)
                    }
                    alt=''
                    draggable={false}
                  />
                )}
              </span>
              <span className='damage-meter-name'>
                {index + 1}. {row.name}
              </span>
              <span className='damage-meter-values'>
                {number(row.damage)} / {number(row.dps)} / {percent.toFixed(1)}%
              </span>
            </>
          );
          const rowStyle = {
            '--class-color': classColors[row.classId ?? 'warrior'] ?? '#a7c4bc',
          } as CSSProperties;

          return selected || mode !== 'damage' ? (
            <div key={row.id} className='damage-meter-row' style={rowStyle}>
              {content}
            </div>
          ) : (
            <ButtonBase
              key={row.id}
              className='damage-meter-row'
              style={rowStyle}
              onClick={() => {
                return select(row.id);
              }}
            >
              {content}
            </ButtonBase>
          );
        })}
        {selected && rows.length === 0 && <p>No damage recorded.</p>}
      </div>
      <Menu
        open={!!menu}
        anchorReference='anchorPosition'
        anchorPosition={menu ?? undefined}
        onClose={() => {
          return setMenu(null);
        }}
        slotProps={{ list: { 'aria-label': 'Meter type' } }}
      >
        {Object.entries(meterModes).map(([key, label]) => {
          return (
            <MenuItem
              key={key}
              selected={mode === key}
              onClick={() => {
                setMode(key as MeterMode);
                select(null);
                setMenu(null);
              }}
            >
              {label}
            </MenuItem>
          );
        })}
      </Menu>
    </aside>
  );
}
