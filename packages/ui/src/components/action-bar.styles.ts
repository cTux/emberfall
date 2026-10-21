import { Paper, alpha, styled } from '@mui/material';

export const ActionSlotStyled = styled(Paper)(({ theme }) => ({
  position: 'relative',
  width: theme.spacing(6.5),
  height: theme.spacing(6.5),
  flexShrink: 0,
  overflow: 'hidden',
  borderRadius: 0,
  backgroundColor: alpha(theme.palette.common.black, 0.76),
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
    width: theme.spacing(5.5),
    height: theme.spacing(5.5),
  },
}));

export const ActionIndicatorStyled = styled('span')(({ theme }) => ({
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
}));
