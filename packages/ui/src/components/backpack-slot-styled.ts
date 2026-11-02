import { EQUIPMENT_STYLE } from './equipment-style.ts';
import { styled, alpha } from '@mui/material/styles';

// Retain the readable near-opaque tooltip, badge backing and recessed slot treatment.
import { ButtonBase } from '@mui/material';

export const BackpackSlotStyled = styled(ButtonBase)(({ theme }) => {
  return {
    position: 'relative',
    width: '100%',
    aspectRatio: '1',
    border: `1px solid ${theme.palette.divider}`,
    borderRadius: theme.shape.borderRadius,
    backgroundColor: theme.palette.wood.dark,
    boxShadow: `inset 0 0 0 2px ${alpha(theme.palette.common.black, EQUIPMENT_STYLE.insetOpacity)}`,
    '& img, & svg': { width: 36, height: 36, objectFit: 'contain', imageRendering: 'pixelated' },
    '&:hover': { borderColor: theme.palette.text.secondary },
    '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
  };
});
