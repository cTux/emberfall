import { HUD_STYLE } from './hud-style.ts';
import { styled, Box } from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.

export const PartyMarkerStyled = styled(Box, {
  shouldForwardProp: (prop) => {
    return prop !== 'side';
  },
})<{ side: 'left' | 'right' }>(({ theme, side }) => {
  return {
    position: 'absolute',
    top: 0,
    [side]: 0,
    display: 'flex',
    fontSize: theme.typography.pxToRem(HUD_STYLE.markerFontPx),
    padding: theme.spacing(HUD_STYLE.markerPadding),
    borderRadius: theme.shape.borderRadius,
    color: theme.palette.primary.main,
    backgroundColor: theme.palette.background.default,
  };
});
