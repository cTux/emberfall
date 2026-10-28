import type { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrosshairs } from '@fortawesome/free-solid-svg-icons/faCrosshairs';
import { AbilityButtonStyled, ActionIndicatorStyled, ActionSlotStyled } from './action-bar.styles';

export interface ActionBarAbility {
  name: string;
  description?: string;
  icon: ReactNode;
  cooldownMs: number;
  remainingMs: number;
  autoCast?: boolean;
  onToggleAutoCast?: () => void;
}

export interface ActionBarProps {
  baseAbility?: ActionBarAbility;
  abilities?: readonly (ActionBarAbility | undefined)[];
  autoFire?: boolean;
  autoTarget?: boolean;
  onChoose?: (slot: number, anchor: HTMLElement) => void;
}

function AutoCastBorder() {
  return (
    <svg
      data-auto-cast-border
      aria-hidden='true'
      viewBox='0 0 100 100'
      preserveAspectRatio='none'
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        zIndex: 2,
        pointerEvents: 'none',
      }}
    >
      <rect
        x='3'
        y='3'
        width='94'
        height='94'
        fill='none'
        stroke='currentColor'
        strokeWidth='3'
        strokeDasharray='12 8'
      />
    </svg>
  );
}

function AbilityCooldown({ ability }: { ability: ActionBarAbility }) {
  const duration = ability.cooldownMs;
  const remaining = Math.max(0, Math.min(duration, ability.remainingMs));
  const fraction = duration > 0 ? remaining / duration : 0;
  const angle = (1 - fraction) * Math.PI * 2 - Math.PI / 2;
  const x = 50 + 72 * Math.cos(angle);
  const y = 50 + 72 * Math.sin(angle);
  const seconds =
    remaining >= 1000 ? Math.ceil(remaining / 1000) : (Math.ceil(remaining / 100) / 10).toFixed(1);
  if (fraction <= 0) return null;
  return (
    <Box
      role='progressbar'
      aria-label={`${ability.name} cooldown`}
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={Math.round(remaining)}
      aria-valuetext={`${seconds} seconds remaining`}
      sx={{ position: 'absolute', inset: 0 }}
    >
      <svg viewBox='0 0 100 100' width='100%' height='100%' aria-hidden='true'>
        {fraction >= 1 ? (
          <rect width='100' height='100' fill='rgba(0, 0, 0, 0.7)' />
        ) : (
          <path
            d={`M 50 50 L ${x} ${y} A 72 72 0 ${fraction > 0.5 ? 1 : 0} 1 50 -22 Z`}
            fill='rgba(0, 0, 0, 0.7)'
          />
        )}
      </svg>
      <Typography
        component='span'
        aria-hidden='true'
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'grid',
          placeItems: 'center',
          fontWeight: 700,
          fontSize: '1.1rem',
          textShadow: '0 1px 3px black',
        }}
      >
        {seconds}
      </Typography>
    </Box>
  );
}

export function ActionBar({
  baseAbility,
  abilities = [],
  autoFire = false,
  autoTarget = false,
  onChoose,
}: ActionBarProps) {
  const duration = baseAbility?.cooldownMs ?? 0;
  return (
    <Stack component='section' aria-label='Action bar' direction='row' spacing={1}>
      {baseAbility && (
        <Tooltip
          describeChild
          placement='top'
          enterTouchDelay={0}
          title={
            <Stack spacing={0.5}>
              <Typography sx={{ fontWeight: 700 }}>{baseAbility.name}</Typography>
              <Typography variant='body2'>
                Cooldown: {duration / 1000} {duration === 1000 ? 'second' : 'seconds'}
              </Typography>
              <Typography variant='body2'>{baseAbility.description}</Typography>
            </Stack>
          }
        >
          <ActionSlotStyled
            role='group'
            aria-label={baseAbility.name}
            tabIndex={0}
            onContextMenu={(event) => {
              event.preventDefault();
              baseAbility.onToggleAutoCast?.();
            }}
            onKeyDown={(event) => {
              if (event.shiftKey && event.key === 'F10') {
                event.preventDefault();
                baseAbility.onToggleAutoCast?.();
              }
            }}
            data-auto-cast={autoFire}
          >
            {autoFire && <AutoCastBorder />}
            {baseAbility.icon}
            <AbilityCooldown ability={baseAbility} />
            <ActionIndicatorStyled
              role='img'
              aria-label={`Left mouse button; auto-fire ${autoFire ? 'enabled' : 'disabled'} (F)`}
              data-active={autoFire}
            >
              <svg width='11' height='14' viewBox='0 0 12 16' aria-hidden='true'>
                <rect x='1' y='1' width='10' height='14' rx='5' fill='none' stroke='currentColor' />
                <path d='M6 1C3 1 1 3 1 6v1h5Z' fill='currentColor' />
                <path d='M6 1v6h5' fill='none' stroke='currentColor' />
              </svg>
            </ActionIndicatorStyled>
            <ActionIndicatorStyled
              role='img'
              aria-label={`Auto-target ${autoTarget ? 'enabled' : 'disabled'} (G)`}
              data-target
              data-active={autoTarget}
            >
              <FontAwesomeIcon icon={faCrosshairs} aria-hidden='true' />
            </ActionIndicatorStyled>
          </ActionSlotStyled>
        </Tooltip>
      )}
      {[1, 2, 3, 4].map((slot) => {
        const ability = abilities[slot - 1];
        if (!ability)
          return (
            <ActionSlotStyled
              key={slot}
              role={onChoose ? 'button' : 'group'}
              tabIndex={onChoose ? 0 : undefined}
              aria-label={`Empty ability slot ${slot}`}
              onClick={(event) => onChoose?.(slot - 1, event.currentTarget)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ' || event.key === 'F2') {
                  event.preventDefault();
                  onChoose?.(slot - 1, event.currentTarget);
                }
              }}
            >
              <ActionIndicatorStyled aria-hidden='true'>{slot}</ActionIndicatorStyled>
            </ActionSlotStyled>
          );
        return (
          <Tooltip
            describeChild
            key={slot}
            placement='top'
            enterTouchDelay={0}
            title={
              <Stack spacing={0.5}>
                <Typography sx={{ fontWeight: 700 }}>{ability.name}</Typography>
                <Typography variant='body2'>
                  Cooldown: {ability.cooldownMs / 1000} seconds
                </Typography>
                <Typography variant='body2'>{ability.description}</Typography>
              </Stack>
            }
          >
            <AbilityButtonStyled
              type='button'
              aria-label={`Choose ability for slot ${slot}: ${ability.name}`}
              data-auto-cast={!!ability.autoCast}
              onClick={(event) => onChoose?.(slot - 1, event.currentTarget)}
              onContextMenu={(event) => {
                event.preventDefault();
                ability.onToggleAutoCast?.();
              }}
              onKeyDown={(event) => {
                if (event.shiftKey && event.key === 'F10') {
                  event.preventDefault();
                  ability.onToggleAutoCast?.();
                }
                if (event.key === 'F2') onChoose?.(slot - 1, event.currentTarget);
              }}
              sx={{
                cursor: 'pointer',
                p: 0,
                '&:focus-visible': { outline: '2px solid', outlineColor: 'primary.main' },
              }}
            >
              {ability.icon}
              {ability.autoCast && <AutoCastBorder />}
              <AbilityCooldown ability={ability} />
              <ActionIndicatorStyled aria-hidden='true'>{slot}</ActionIndicatorStyled>
            </AbilityButtonStyled>
          </Tooltip>
        );
      })}
    </Stack>
  );
}
