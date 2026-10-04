import { Box, alpha, styled } from "@mui/material";

export const WorldLabelStyled = styled(Box)(({ theme }) => ({
  position: "absolute",
  left: 0,
  top: 0,
  width: "max-content",
  maxWidth: "min(220px, calc(100vw - 16px))",
  pointerEvents: "none",
  color: theme.palette.text.primary,
  fontFamily: theme.typography.fontFamily,
  fontSize: theme.typography.caption.fontSize,
  lineHeight: theme.typography.caption.lineHeight,
  "&[data-active=true]": { color: theme.palette.primary.light },
  "&[data-tone=boss]": { color: theme.palette.warning.main },
  "&[data-tone=portal]": { color: theme.palette.info.main },
  "&[data-kind=navigation][data-tone=party]": { color: theme.palette.success.main },
  "& .direction": {
    position: "absolute",
    left: "50%",
    top: 0,
    transform: "translate(-50%, -100%) rotate(calc(var(--direction, 0rad) + 45deg))",
    fontSize: theme.typography.body1.fontSize,
  },
}));

export const WorldLabelTextStyled = styled(Box)(({ theme }) => ({
  padding: theme.spacing(0.5, 1),
  backgroundColor: alpha(theme.palette.background.paper, 0.94),
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  overflowWrap: "anywhere",
  whiteSpace: "pre-wrap",
  "&[data-kind=chat]": { padding: theme.spacing(1), textAlign: "center" },
  "&[data-kind=navigation]": { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
}));
