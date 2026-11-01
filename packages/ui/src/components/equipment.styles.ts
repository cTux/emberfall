import { createElement } from 'react';
import { Box, ButtonBase, Tooltip, tooltipClasses } from '@mui/material';
import type { TooltipProps } from '@mui/material';
import { alpha, styled } from '@mui/material/styles';

// Retain the readable near-opaque tooltip, badge backing and recessed slot treatment.
const EQUIPMENT_STYLE = {
  tooltipOpacity: 0.94,
  tooltipPadding: 1.25,
  badgeOpacity: 0.85,
  badgeFontPx: 14,
  insetOpacity: 0.4,
};

// Preserve the established 44px inventory cell shared with fixed equipment geometry.
export const BACKPACK_SLOT_SIZE = 44;
// Equipment artwork occupies cells twenty percent larger than the backpack cells.
const EQUIPMENT_SLOT_SCALE = 1.2;
export const EQUIPMENT_SLOT_SIZE = BACKPACK_SLOT_SIZE * EQUIPMENT_SLOT_SCALE;

export const GearTooltipStyled = styled(({ className, ...props }: TooltipProps) => {
  return createElement(Tooltip, { ...props, classes: { popper: className } });
})(({ theme }) => {
  return {
    [`& .${tooltipClasses.tooltip}`]: {
      backgroundColor: alpha(theme.palette.common.black, EQUIPMENT_STYLE.tooltipOpacity),
      width: 250,
      maxHeight: 'calc(100vh - 32px)',
      overflowY: 'auto',
      maxWidth: 'calc(100vw - 32px)',
      boxSizing: 'border-box',
      padding: theme.spacing(EQUIPMENT_STYLE.tooltipPadding),
    },
  };
});

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
