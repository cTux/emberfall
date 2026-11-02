import { HUD_STYLE } from './hud-style.ts';
import { styled, IconButton } from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.

export const HudActionButtonStyled = styled(IconButton)(({ theme }) => {
  return {
    width: theme.spacing(HUD_STYLE.buttonWidth),
    height: theme.spacing(HUD_STYLE.buttonHeight),
    padding: theme.spacing(HUD_STYLE.smallGap),
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: theme.spacing(HUD_STYLE.smallGap),
  };
});
