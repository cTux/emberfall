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
