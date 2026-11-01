import { Paper, ButtonBase, alpha, styled } from '@mui/material';

// Preserve the existing 52px/44px slot sizes and translucent scene backing.
const ACTION_STYLE = { slot: 6.5, compactSlot: 5.5, opacity: 0.76 };

const autoCastStyle = {
  '& [data-auto-cast-border]': { color: 'inherit' },
  '& [data-auto-cast-border] rect': { animation: 'auto-cast-dashes 1s linear infinite' },
  '@keyframes auto-cast-dashes': { to: { strokeDashoffset: -20 } },
  '@media (prefers-reduced-motion: reduce)': {
    '& [data-auto-cast-border] rect': { animation: 'none' },
  },
};

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

export const ActionIndicatorStyled = styled('span')(({ theme }) => {
  return {
    position: 'absolute',
    zIndex: 1,
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 2,
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.secondary,
    fontSize: 12,
    fontWeight: 700,
    lineHeight: 1,
    pointerEvents: 'none',
    '&[data-target]': { right: 'auto', left: 2 },
    '&[data-active=true]': {
      color: theme.palette.primary.main,
      boxShadow: '0 0 4px currentColor',
      animation: 'action-indicator-pulse 1.5s ease-in-out infinite alternate',
    },
    '@keyframes action-indicator-pulse': {
      from: { boxShadow: '0 0 2px currentColor' },
      to: { boxShadow: '0 0 7px currentColor' },
    },
    '@media (prefers-reduced-motion: reduce)': {
      '&[data-active=true]': { animation: 'none' },
    },
  };
});

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
