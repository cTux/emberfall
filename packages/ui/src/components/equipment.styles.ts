import { createElement } from "react";
import { Box, ButtonBase, Tooltip, tooltipClasses } from "@mui/material";
import type { TooltipProps } from "@mui/material";
import { alpha, styled } from "@mui/material/styles";

export const GearTooltipStyled = styled(({ className, ...props }: TooltipProps) =>
  createElement(Tooltip, { ...props, classes: { popper: className } }),
)(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: alpha(theme.palette.common.black, 0.88),
    color: theme.palette.text.primary,
    width: 236,
    maxWidth: "calc(100vw - 32px)",
    boxSizing: "border-box",
    padding: theme.spacing(1.25),
  },
  [`& .${tooltipClasses.arrow}`]: { color: alpha(theme.palette.common.black, 0.88) },
}));

export const GearBadgeStyled = styled(ButtonBase)(({ theme }) => ({
  position: "relative",
  width: 50,
  height: 50,
  flexShrink: 0,
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.white, 0.05),
  "&:hover": { backgroundColor: alpha(theme.palette.common.white, 0.12) },
  "&.Mui-focusVisible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 1 },
}));

export const GearBadgeValueStyled = styled(Box)(({ theme }) => ({
  position: "absolute",
  bottom: 0,
  right: 2,
  padding: "0 2px",
  borderRadius: theme.shape.borderRadius,
  backgroundColor: alpha(theme.palette.common.black, 0.85),
  color: theme.palette.text.primary,
  fontSize: theme.typography.pxToRem(14),
  lineHeight: 1.2,
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
}));
