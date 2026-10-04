import {
  Box,
  LinearProgress,
  Paper,
  Stack,
  alpha,
  linearProgressClasses,
  styled,
} from "@mui/material";

export const PartyCardStyled = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1),
  backgroundColor: "transparent",
  border: 0,
  boxShadow: "none",
}));

export const PartyPortraitStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ theme, compact }) => ({
  position: "relative",
  width: theme.spacing(compact ? 2.5 : 3),
  height: theme.spacing(compact ? 2.5 : 3),
  flexShrink: 0,
  "& > :first-child": { width: "100%", height: "100%", display: "block" },
}));

export const PartyMarkerStyled = styled(Box, {
  shouldForwardProp: (prop) => prop !== "side",
})<{ side: "left" | "right" }>(({ theme, side }) => ({
  position: "absolute",
  top: 0,
  [side]: 0,
  display: "flex",
  fontSize: theme.typography.pxToRem(9),
  padding: theme.spacing(0.125),
  borderRadius: theme.shape.borderRadius,
  color: theme.palette.primary.main,
  backgroundColor: theme.palette.background.default,
}));

export const BossHealthStyled = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  textAlign: "center",
  backgroundColor: alpha(theme.palette.background.paper, 0.15),
  borderColor: alpha(theme.palette.divider, 0.15),
}));

export const PortalVoteStyled = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  backgroundColor: alpha(theme.palette.background.paper, 0.15),
  borderColor: alpha(theme.palette.divider, 0.15),
}));

export const StatusMeterStyled = styled(Box)({ position: "relative" });

export const StatusMeterProgressStyled = styled(LinearProgress, {
  shouldForwardProp: (prop) => prop !== "compact",
})<{ compact?: boolean }>(({ theme, color = "primary", compact }) => ({
  height: theme.spacing(compact ? 2.5 : 3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.background.paper,
  // Solid muted fills keep parchment text readable without showing the scene through.
  [`& .${linearProgressClasses.bar}`]: {
    backgroundColor: `color-mix(in srgb, ${color === "inherit" ? "currentColor" : theme.palette[color].main} 40%, ${theme.palette.background.paper})`,
  },
}));

export const StatusMeterTextStyled = styled(Stack, {
  shouldForwardProp: (prop) => prop !== "centered",
})<{ centered: boolean }>(({ theme, centered }) => ({
  position: "absolute",
  inset: 0,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: centered ? "center" : "space-between",
  gap: theme.spacing(1),
  paddingInline: theme.spacing(1),
  color: theme.palette.text.primary,
  pointerEvents: "none",
}));
