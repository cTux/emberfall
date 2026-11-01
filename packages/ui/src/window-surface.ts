import { alpha, type Theme } from '@mui/material/styles';

// Keep the established translucent backing so the world remains visible behind windows.
const WINDOW_BACKING_OPACITY = 0.76;

export const windowSurface = (theme: Theme) => {
  return {
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: 0,
    backgroundColor: alpha(theme.palette.common.black, WINDOW_BACKING_OPACITY),
    backgroundImage: 'none',
    backgroundClip: 'padding-box',
    color: theme.palette.text.primary,
  };
};
