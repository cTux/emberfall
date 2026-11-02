import { HUD_STYLE } from './hud-style.ts';
import { styled, Paper, alpha } from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.

export const BossHealthStyled = styled(Paper)(({ theme }) => {
  return {
    padding: theme.spacing(HUD_STYLE.panelPadding),
    textAlign: 'center',
    backgroundColor: alpha(theme.palette.background.paper, HUD_STYLE.panelOpacity),
    borderColor: alpha(theme.palette.divider, HUD_STYLE.panelOpacity),
  };
});
