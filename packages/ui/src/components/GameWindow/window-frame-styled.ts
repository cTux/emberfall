import { styled, Paper } from '@mui/material';

// Preserve the 36px title/close-button track within the existing panel header.

export const WindowFrameStyled = styled(Paper)(({ theme }) => {
  return {
    '&&': {
      '--window-tabs-width': '112px',
      display: 'grid',
      gridTemplateColumns: 'auto minmax(0, 1fr)',
      gridTemplateRows: 'minmax(0, 1fr)',
      width: 'min(100%, var(--window-width))',
      maxHeight: 'min(480px, calc(100dvh - 32px))',
      overflow: 'visible',
      border: 0,
      backgroundColor: 'transparent',
      boxShadow: 'none',
      '&:has([role="tablist"])': {
        width: `min(100%, calc(var(--window-width) + var(--window-tabs-width) + ${theme.spacing(1)}))`,
        columnGap: theme.spacing(1),
      },
      [theme.breakpoints.down('sm')]: { '--window-tabs-width': '80px' },
    },
  };
}) as typeof Paper;
