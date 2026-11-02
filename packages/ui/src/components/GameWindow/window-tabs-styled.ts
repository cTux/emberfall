import { styled, Box } from '@mui/material';

// Preserve the 36px title/close-button track within the existing panel header.

// Preserve the 36px title/close-button track within the existing panel header.
const TITLE_TRACK_SPACING = 4.5;

export const WindowTabsStyled = styled(Box)(({ theme }) => {
  return {
    width: 'var(--window-tabs-width)',
    paddingTop: theme.spacing(TITLE_TRACK_SPACING),
    minHeight: 0,
    display: 'flex',
    '&:empty': { display: 'none' },
    '& .MuiTabs-root': { flex: 1, minHeight: 0 },
  };
});
