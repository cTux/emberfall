import { Box, styled } from "@mui/material";

export const WindowTitleStyled = styled(Box)(({ theme }) => ({
  display: "flex",
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "space-between",
  paddingRight: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`,
  cursor: "move",
  touchAction: "none",
}));
