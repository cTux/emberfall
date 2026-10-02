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
  backgroundColor: alpha(theme.palette.background.paper, 0.15),
  borderColor: alpha(theme.palette.divider, 0.15),
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

export const StatusMeterProgressStyled = styled(LinearProgress)(({ theme }) => ({
  height: theme.spacing(3),
  borderRadius: theme.shape.borderRadius,
  backgroundColor: theme.palette.action.selected,
  // Keep overlaid text readable over both the filled and empty portions.
  [`& .${linearProgressClasses.bar}`]: { opacity: 0.4 },
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
