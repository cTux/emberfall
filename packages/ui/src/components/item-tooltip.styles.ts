import { Box, ButtonBase } from '@mui/material';
import { styled } from '@mui/material/styles';

// Retain the compact item card: small group gaps, separated sections and prominent primary stats.
const ITEM_TOOLTIP_STYLE = {
  gap: 0.5,
  sectionPadding: 0.75,
  sectionMargin: 0.25,
  powerFontPx: 24,
  statFontPx: 14,
};

export const ItemTooltipContentStyled = styled(Box)(({ theme }) => {
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: theme.spacing(ITEM_TOOLTIP_STYLE.gap),
    '& .item-header': {
      paddingBottom: theme.spacing(ITEM_TOOLTIP_STYLE.sectionPadding),
      marginBottom: theme.spacing(ITEM_TOOLTIP_STYLE.sectionMargin),
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '& .item-icon': {
      width: 32,
      height: 32,
      flexShrink: 0,
      '& img, & canvas, & svg': {
        width: '100%',
        height: '100%',
        objectFit: 'contain',
        imageRendering: 'pixelated',
      },
    },
    '& .item-power': {
      fontSize: theme.typography.pxToRem(ITEM_TOOLTIP_STYLE.powerFontPx),
      lineHeight: 1.1,
      fontWeight: 700,
      color: theme.palette.primary.main,
    },
    '& .item-footer': {
      columnGap: theme.spacing(1),
      paddingTop: theme.spacing(ITEM_TOOLTIP_STYLE.sectionPadding),
      marginTop: theme.spacing(ITEM_TOOLTIP_STYLE.sectionMargin),
      borderTop: `1px solid ${theme.palette.divider}`,
    },
  };
});

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
