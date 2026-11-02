import { EQUIPMENT_STYLE } from './equipment-style.ts';
import { styled, alpha } from '@mui/material/styles';

// Retain the readable near-opaque tooltip, badge backing and recessed slot treatment.
import type { TooltipProps } from '@mui/material';
import { createElement } from 'react';
import { Tooltip, tooltipClasses } from '@mui/material';

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
