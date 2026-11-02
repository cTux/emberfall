import { EQUIPMENT_STYLE } from './equipment-style.ts';
import { styled, alpha } from '@mui/material/styles';

// Retain the readable near-opaque tooltip, badge backing and recessed slot treatment.
import { Box } from '@mui/material';

export const GearBadgeValueStyled = styled(Box)(({ theme }) => {
  return {
    position: 'absolute',
    bottom: 0,
    right: 2,
    padding: '0 2px',
    borderRadius: theme.shape.borderRadius,
    backgroundColor: alpha(theme.palette.common.black, EQUIPMENT_STYLE.badgeOpacity),
    color: theme.palette.text.primary,
    fontSize: theme.typography.pxToRem(EQUIPMENT_STYLE.badgeFontPx),
    lineHeight: 1.2,
    fontWeight: 700,
    fontVariantNumeric: 'tabular-nums',
  };
});
