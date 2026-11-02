import { ITEM_TOOLTIP_STYLE } from './item-tooltip-style.ts';
import { styled } from '@mui/material/styles';

// Retain the compact item card: small group gaps, separated sections and prominent primary stats.
import { ButtonBase } from '@mui/material';

export const ItemStatStyled = styled(ButtonBase)(({ theme }) => {
  return {
    width: '100%',
    justifyContent: 'space-between',
    gap: theme.spacing(1),
    textAlign: 'left',
    fontSize: theme.typography.pxToRem(ITEM_TOOLTIP_STYLE.statFontPx),
    lineHeight: 1.4,
    '&[data-equipment-badge=power]': {
      fontWeight: 700,
      flexDirection: 'row-reverse',
      justifyContent: 'flex-end',
      '& span:last-child': {
        fontSize: theme.typography.pxToRem(ITEM_TOOLTIP_STYLE.powerFontPx),
        color: theme.palette.primary.main,
        lineHeight: 1.1,
      },
    },
    '&:hover': { backgroundColor: theme.palette.action.hover },
    '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
  };
});
