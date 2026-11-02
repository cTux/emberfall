import { HUD_STYLE } from './hud-style.ts';
import { styled, LinearProgress, linearProgressClasses } from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.

export const StatusMeterProgressStyled = styled(LinearProgress, {
  shouldForwardProp: (prop) => {
    return prop !== 'compact' && prop !== 'thin';
  },
})<{ compact?: boolean; thin?: boolean }>(({ theme, color = 'primary', compact, thin }) => {
  return {
    height: theme.spacing(
      thin ? HUD_STYLE.thinMeter : compact ? HUD_STYLE.compactPortrait : HUD_STYLE.portrait,
    ),
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    // Solid muted fills keep parchment text readable without showing the scene through.
    [`& .${linearProgressClasses.bar}`]: {
      backgroundColor: `color-mix(in srgb, ${color === 'inherit' ? 'currentColor' : theme.palette[color].main} 40%, ${theme.palette.background.paper})`,
    },
  };
});
