import { alpha, type Theme } from '@mui/material/styles';

export const windowSurface = (theme: Theme) => ({
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: 0,
  backgroundColor: alpha(theme.palette.common.black, 0.76),
  backgroundImage: 'none',
  backgroundClip: 'padding-box',
  color: theme.palette.text.primary,
});
