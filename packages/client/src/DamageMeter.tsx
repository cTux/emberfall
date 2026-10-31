import { useState, type CSSProperties } from 'react';
import { useDraggable } from '@emberfall/ui';
import { ButtonBase, IconButton } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons/faArrowLeft';
import type { Player } from '@emberfall/common';
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
const number = (value: number) => value.toLocaleString('en', { maximumFractionDigits: 1 });

export function DamageMeter({ players, playerId }: { players: Player[]; playerId: string }) {
  const [selectedId, select] = useState<string | null>(null);
  const { ref, style, handleProps } = useDraggable('panel.dps');
  const me = players.find((player) => player.id === playerId);
  const party = players.filter(
    (player) => player.id === playerId || (!!me?.partyId && player.partyId === me.partyId),
  );
  const selected = party.find((player) => player.id === selectedId);
  const total = party.reduce((sum, player) => sum + (player.damageMeter?.total ?? 0), 0);
  const rows = selected
    ? Object.entries(selected.damageMeter?.abilities ?? {}).map(([name, value]) => ({
        id: name,
        name,
        damage: value.damage,
        dps: value.dps,
        classId: selected.classId,
      }))
    : party.map((player) => ({
        id: player.id,
        name: player.name,
        damage: player.damageMeter?.total ?? 0,
        dps: player.dps ?? 0,
        classId: player.classId,
      }));
  rows.sort((a, b) => b.damage - a.damage || a.name.localeCompare(b.name));
  const denominator = selected ? (selected.damageMeter?.total ?? 0) : total;

  return (
    // oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- Right-click anywhere is a shortcut; rows and Back also support keyboard activation.
    <aside
      className='dps-meter'
      aria-label='Damage per second'
      ref={ref}
      style={style}
      onContextMenu={(event) => {
        event.preventDefault();
        select(null);
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <header {...handleProps}>
        <strong>{selected ? `${selected.name} — Abilities` : 'Damage done'}</strong>
        {selected && (
          <IconButton size='small' onClick={() => select(null)} aria-label='Back to party'>
            <FontAwesomeIcon icon={faArrowLeft} />
          </IconButton>
        )}
      </header>
      <div className='damage-meter-rows'>
        {rows.map((row, index) => {
          const percent = denominator > 0 ? (row.damage / denominator) * 100 : 0;
          const classId = row.classId ?? 'warrior';
          const talent = selected
            ? TALENT_TREE.find((node) => node.classId === classId && node.name === row.name)
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

          return selected ? (
            <div key={row.id} className='damage-meter-row' style={rowStyle}>
              {content}
            </div>
          ) : (
            <ButtonBase
              key={row.id}
              className='damage-meter-row'
              style={rowStyle}
              onClick={() => select(row.id)}
            >
              {content}
            </ButtonBase>
          );
        })}
        {selected && rows.length === 0 && <p>No damage recorded.</p>}
      </div>
    </aside>
  );
}
