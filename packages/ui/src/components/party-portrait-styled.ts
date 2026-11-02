import { HUD_STYLE } from './hud-style.ts';
import { styled, Box } from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.

export const PartyPortraitStyled = styled(Box, {
  shouldForwardProp: (prop) => {
    return prop !== 'compact';
  },
})<{ compact?: boolean }>(({ theme, compact }) => {
  return {
    position: 'relative',
    width: theme.spacing(compact ? HUD_STYLE.compactPortrait : HUD_STYLE.portrait),
    height: theme.spacing(compact ? HUD_STYLE.compactPortrait : HUD_STYLE.portrait),
    flexShrink: 0,
    '& > :first-child': { width: '100%', height: '100%', display: 'block' },
  };
});
