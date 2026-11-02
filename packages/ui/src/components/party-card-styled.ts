import { styled, Paper } from '@mui/material';

// Preserve existing HUD spacing/type and compact party meters; these are visual calibration values.

export const PartyCardStyled = styled(Paper)(({ theme }) => {
  return {
    padding: theme.spacing(1),
    backgroundColor: 'transparent',
    border: 0,
    boxShadow: 'none',
  };
});
