import type { ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { ActionSlotStyled } from './action-bar.styles';

export interface ActionBarAbility {
  name: string;
  icon: ReactNode;
  cooldownMs: number;
  remainingMs: number;
}

export interface ActionBarProps {
  baseAbility?: ActionBarAbility;
}

export function ActionBar({ baseAbility }: ActionBarProps) {
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
        <ActionSlotStyled role='group' aria-label={baseAbility.name}>
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
        </ActionSlotStyled>
      )}
      {[1, 2, 3, 4].map((slot) => (
        <ActionSlotStyled key={slot} role='group' aria-label={`Empty ability slot ${slot}`} />
      ))}
    </Stack>
  );
}
