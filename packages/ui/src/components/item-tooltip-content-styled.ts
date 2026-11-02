import { ITEM_TOOLTIP_STYLE } from './item-tooltip-style.ts';
import { styled } from '@mui/material/styles';

// Retain the compact item card: small group gaps, separated sections and prominent primary stats.
import { Box } from '@mui/material';

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
