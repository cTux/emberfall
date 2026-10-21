import type { ReactNode } from 'react';
import { Box, Stack, Tooltip, Typography } from '@mui/material';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCrosshairs } from '@fortawesome/free-solid-svg-icons/faCrosshairs';
import { ActionIndicatorStyled, ActionSlotStyled } from './action-bar.styles';

export interface ActionBarAbility {
  name: string;
  icon: ReactNode;
  cooldownMs: number;
  remainingMs: number;
}

export interface ActionBarProps {
  baseAbility?: ActionBarAbility;
  autoFire?: boolean;
  autoTarget?: boolean;
}

export function ActionBar({ baseAbility, autoFire = false, autoTarget = false }: ActionBarProps) {
  const duration = baseAbility?.cooldownMs ?? 0;
  const remaining = Math.max(0, Math.min(duration, baseAbility?.remainingMs ?? 0));
  const fraction = duration > 0 ? remaining / duration : 0;
  const angle = (1 - fraction) * Math.PI * 2 - Math.PI / 2;
  const x = 50 + 72 * Math.cos(angle);
  const y = 50 + 72 * Math.sin(angle);
  const seconds =
    remaining >= 1000 ? Math.ceil(remaining / 1000) : (Math.ceil(remaining / 100) / 10).toFixed(1);
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
              <Typography variant='body2'>Left mouse button to cast</Typography>
              <Typography variant='body2'>Auto-fire: {autoFire ? 'On' : 'Off'} (F)</Typography>
              <Typography variant='body2'>Auto-target: {autoTarget ? 'On' : 'Off'} (G)</Typography>
            </Stack>
          }
        >
          <ActionSlotStyled role='group' aria-label={baseAbility.name} tabIndex={0}>
            {baseAbility.icon}
            {fraction > 0 && (
              <Box
                role='progressbar'
                aria-label={`${baseAbility.name} cooldown`}
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
            )}
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
      {[1, 2, 3, 4].map((slot) => (
        <ActionSlotStyled key={slot} role='group' aria-label={`Empty ability slot ${slot}`}>
          <ActionIndicatorStyled aria-hidden='true'>{slot}</ActionIndicatorStyled>
        </ActionSlotStyled>
      ))}
    </Stack>
  );
}
