import { Box, Paper, styled } from '@mui/material';

export const WindowFrameStyled = styled(Paper)(({ theme }) => ({
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
})) as typeof Paper;

export const WindowTabsStyled = styled(Box)(({ theme }) => ({
  width: 'var(--window-tabs-width)',
  paddingTop: theme.spacing(4.5),
  minHeight: 0,
  display: 'flex',
  '&:empty': { display: 'none' },
  '& .MuiTabs-root': { flex: 1, minHeight: 0 },
}));

export const WindowTitleStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexShrink: 0,
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingRight: theme.spacing(1),
  cursor: 'move',
  touchAction: 'none',
}));
