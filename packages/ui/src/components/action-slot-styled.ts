import { autoCastStyle } from './auto-cast-style.ts';
import { ACTION_STYLE } from './action-style.ts';
import { styled, Paper, alpha } from '@mui/material';

// Preserve the existing 52px/44px slot sizes and translucent scene backing.

export const ActionSlotStyled = styled(Paper)(({ theme }) => {
  return {
    ...autoCastStyle,
    '& [data-auto-cast-border]': { color: theme.palette.primary.main },
    position: 'relative',
    width: theme.spacing(ACTION_STYLE.slot),
    height: theme.spacing(ACTION_STYLE.slot),
    flexShrink: 0,
    overflow: 'hidden',
    borderRadius: 0,
    backgroundColor: alpha(theme.palette.common.black, ACTION_STYLE.opacity),
    borderColor: theme.palette.divider,
    display: 'grid',
    placeItems: 'center',
    '& > img': {
      width: '100%',
      height: '100%',
      objectFit: 'contain',
      imageRendering: 'pixelated',
    },
    [theme.breakpoints.down('sm')]: {
      width: theme.spacing(ACTION_STYLE.compactSlot),
      height: theme.spacing(ACTION_STYLE.compactSlot),
    },
  };
});
