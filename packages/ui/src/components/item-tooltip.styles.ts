import { Box, ButtonBase } from '@mui/material';
import { styled } from '@mui/material/styles';

export const ItemTooltipContentStyled = styled(Box)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  gap: theme.spacing(0.5),
  '& .item-header': {
    paddingBottom: theme.spacing(0.75),
    marginBottom: theme.spacing(0.25),
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
    fontSize: theme.typography.pxToRem(24),
    lineHeight: 1.1,
    fontWeight: 700,
    color: theme.palette.primary.main,
  },
  '& .item-footer': {
    columnGap: theme.spacing(1),
    paddingTop: theme.spacing(0.75),
    marginTop: theme.spacing(0.25),
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

export const ItemStatStyled = styled(ButtonBase)(({ theme }) => ({
  width: '100%',
  justifyContent: 'space-between',
  gap: theme.spacing(1),
  textAlign: 'left',
  fontSize: theme.typography.pxToRem(14),
  lineHeight: 1.4,
  '&[data-equipment-badge=power]': {
    fontWeight: 700,
    flexDirection: 'row-reverse',
    justifyContent: 'flex-end',
    '& span:last-child': {
      fontSize: theme.typography.pxToRem(24),
      color: theme.palette.primary.main,
      lineHeight: 1.1,
    },
  },
  '&:hover': { backgroundColor: theme.palette.action.hover },
  '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
}));
