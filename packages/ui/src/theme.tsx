import type { ReactNode } from "react";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";

declare module "@mui/material/styles" {
  interface Palette {
    boss: Palette["primary"];
  }
  interface PaletteOptions {
    boss?: PaletteOptions["primary"];
  }
}
declare module "@mui/material/LinearProgress" {
  interface LinearProgressPropsColorOverrides {
    boss: true;
  }
}

// One source of truth: forest surfaces, parchment text, ember actions.
export const gameTheme = createTheme({
  palette: {
    mode: "dark",
    primary: { main: "#e6be80", contrastText: "#17221c" },
    secondary: { main: "#9bbca1" },
    background: { default: "#101817", paper: "#192820" },
    text: { primary: "#eeeddf", secondary: "#b8c9b7" },
    divider: "#46594a",
    success: { main: "#83cba3" },
    info: { main: "#88b8df" },
    warning: { main: "#e6be80" },
    error: { main: "#ef9b85" },
    boss: { main: "#bd94e8" },
  },
  typography: {
    fontFamily: '"Alegreya Sans", sans-serif',
    h1: { fontSize: "2rem", fontWeight: 700 },
    h2: { fontSize: "1.5rem", fontWeight: 700 },
    h3: { fontSize: "1.2rem", fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 700 },
  },
  shape: { borderRadius: 5 },
  components: {
    MuiCssBaseline: {
      styleOverrides: () => [
        ...[400, 500, 700].map((weight) => ({
          "@font-face": {
            fontFamily: "Alegreya Sans",
            fontStyle: "normal" as const,
            fontWeight: weight,
            fontDisplay: "swap" as const,
            src: `url('/fonts/AlegreyaSans-${weight === 400 ? "Regular" : weight === 500 ? "Medium" : "Bold"}.ttf') format('truetype')`,
          },
        })),
        {
          "*, *::before, *::after": { userSelect: "none" },
          ":focus-visible": { outline: "2px solid #e6be80", outlineOffset: 3 },
          "@media (prefers-reduced-motion: reduce)": {
            "*, *::before, *::after": {
              animation: "none !important",
              transition: "none !important",
            },
          },
        },
      ],
    },
    MuiButton: { defaultProps: { size: "small", disableElevation: true } },
    MuiIconButton: { defaultProps: { size: "small" } },
    MuiTextField: { defaultProps: { size: "small", fullWidth: true } },
    MuiFormControl: { defaultProps: { size: "small" } },
    MuiPaper: {
      defaultProps: { variant: "outlined" },
      styleOverrides: { root: { backgroundImage: "none" } },
    },
    MuiDialog: { defaultProps: { fullWidth: true, maxWidth: "sm" } },
    MuiTabs: { defaultProps: { variant: "scrollable", scrollButtons: "auto" } },
    MuiLinearProgress: { styleOverrides: { root: { height: 6, borderRadius: 5 } } },
  },
});

export function GameUiProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={gameTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
