import { autoCastStyle } from './auto-cast-style.ts';
import { ACTION_STYLE } from './action-style.ts';
import { styled, ButtonBase, alpha } from '@mui/material';

// Preserve the existing 52px/44px slot sizes and translucent scene backing.

export const AbilityButtonStyled = styled(ButtonBase)(({ theme }) => {
  return {
    ...autoCastStyle,
    '& [data-auto-cast-border]': { color: theme.palette.primary.main },
    position: 'relative',
    width: theme.spacing(ACTION_STYLE.slot),
    height: theme.spacing(ACTION_STYLE.slot),
    overflow: 'hidden',
    flexShrink: 0,
    border: `1px solid ${theme.palette.divider}`,
    backgroundColor: alpha(theme.palette.common.black, ACTION_STYLE.opacity),
    [theme.breakpoints.down('sm')]: {
      width: theme.spacing(ACTION_STYLE.compactSlot),
      height: theme.spacing(ACTION_STYLE.compactSlot),
    },
  };
});
