import { HUD_STYLE } from './hud-style.ts';
import { styled } from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.

export const HudShortcutStyled = styled('kbd')(({ theme }) => {
  return {
    minWidth: theme.spacing(HUD_STYLE.shortcutWidth),
    padding: theme.spacing(0, HUD_STYLE.smallGap),
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.background.paper,
    color: theme.palette.text.secondary,
    fontFamily: 'inherit',
    fontSize: theme.typography.pxToRem(HUD_STYLE.shortcutFontPx),
    fontWeight: 700,
    lineHeight: theme.spacing(HUD_STYLE.shortcutLineHeight),
    pointerEvents: 'none',
  };
});
