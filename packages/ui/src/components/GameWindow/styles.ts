import { Box, styled } from "@mui/material";

export const WindowTitleStyled = styled(Box)(({ theme }) => ({
  display: "flex",
  flexShrink: 0,
  alignItems: "center",
  justifyContent: "space-between",
  paddingRight: theme.spacing(1),
  cursor: "move",
  touchAction: "none",
}));
