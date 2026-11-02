import { styled, Box } from '@mui/material';

// Preserve the 36px title/close-button track within the existing panel header.

export const WindowTitleStyled = styled(Box)(({ theme }) => {
  return {
    display: 'flex',
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: theme.spacing(1),
    cursor: 'move',
    touchAction: 'none',
  };
});
