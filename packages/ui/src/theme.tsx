import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline, GlobalStyles, ThemeProvider, createTheme } from '@mui/material';
import { windowSurface } from './window-surface';
import type { GameFont } from './fonts';
import { fontFaces } from './font-faces';

// Preserve the compact tooltip type size and ten-pixel theme-scaled padding.
const TOOLTIP_STYLE = { fontPx: 14, padding: 1.25 };

declare module '@mui/material/styles' {
  interface Palette {
    boss: Palette['primary'];
    wood: Palette['primary'];
  }
  interface PaletteOptions {
    boss?: PaletteOptions['primary'];
    wood?: PaletteOptions['primary'];
  }
}
declare module '@mui/material/LinearProgress' {
  interface LinearProgressPropsColorOverrides {
    boss: true;
  }
}

// One source of truth: forest surfaces, parchment text, ember actions.
const createGameTheme = (fontFamily = '"Alegreya Sans", sans-serif') => {
  return createTheme({
    palette: {
      mode: 'dark',
      primary: { main: '#e6be80', contrastText: '#17221c' },
      secondary: { main: '#9bbca1' },
      background: { default: '#101817', paper: '#192820' },
      text: { primary: '#eeeddf', secondary: '#b8c9b7' },
      divider: '#875039',
      wood: { main: '#875039', dark: '#281a14', light: '#583524' },
      success: { main: '#83cba3' },
      info: { main: '#88b8df' },
      warning: { main: '#e6be80' },
      error: { main: '#ef9b85' },
      boss: { main: '#bd94e8' },
    },
    typography: {
      fontSize: 14,
      fontFamily,
      h1: { fontSize: '2rem', fontWeight: 700 },
      h2: { fontSize: '1.25rem', fontWeight: 700 },
      h3: { fontSize: '1.2rem', fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    shape: { borderRadius: 5 },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => {
          return [
            {
              '*, *::before, *::after': { userSelect: 'none' },
              '*': {
                scrollbarWidth: 'thin',
                scrollbarColor: `${theme.palette.divider} ${theme.palette.background.default}`,
              },
              '*::-webkit-scrollbar': { width: 8, height: 8 },
              '*::-webkit-scrollbar-track': { backgroundColor: theme.palette.background.default },
              '*::-webkit-scrollbar-thumb': {
                backgroundColor: theme.palette.divider,
                borderRadius: 5,
              },
              '*::-webkit-scrollbar-thumb:hover': { backgroundColor: theme.palette.secondary.main },
              ':focus-visible': { outline: '2px solid #e6be80', outlineOffset: 3 },
              '@media (prefers-reduced-motion: reduce)': {
                '*, *::before, *::after': {
                  animation: 'none !important',
                  transition: 'none !important',
                },
              },
            },
          ];
        },
      },
      MuiButton: { defaultProps: { size: 'small', disableElevation: true } },
      MuiButtonBase: { styleOverrides: { root: { fontFamily: 'inherit' } } },
      MuiIconButton: { defaultProps: { size: 'small' } },
      MuiSwitch: { defaultProps: { size: 'small' } },
      MuiDialogTitle: { styleOverrides: { root: { padding: 12 } } },
      MuiTab: {
        styleOverrides: {
          root: ({ theme }) => {
            return {
              minHeight: 30,
              minWidth: 64,
              padding: '4px 12px',
              marginBottom: 4,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: '3px 0 0 3px',
              textAlign: 'left',
              alignItems: 'flex-start',
              color: theme.palette.text.primary,
              backgroundColor: theme.palette.wood.dark,
              '&:hover': { backgroundColor: theme.palette.wood.light },
              '&.Mui-selected': {
                color: theme.palette.primary.main,
                backgroundColor: theme.palette.wood.light,
                borderColor: theme.palette.primary.main,
              },
              '&.Mui-focusVisible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -3,
              },
            };
          },
        },
      },
      MuiTextField: { defaultProps: { size: 'small', fullWidth: true } },
      MuiFormControl: { defaultProps: { size: 'small' } },
      MuiMenu: {
        styleOverrides: {
          paper: ({ theme }) => {
            return {
              ...windowSurface(theme),
              backgroundColor: theme.palette.wood.dark,
            };
          },
        },
      },
      MuiMenuItem: {
        styleOverrides: {
          root: ({ theme }) => {
            return {
              '&:hover, &.Mui-focusVisible': { backgroundColor: theme.palette.wood.light },
              '&.Mui-selected': {
                color: theme.palette.primary.main,
                backgroundColor: theme.palette.wood.light,
                '&:hover, &.Mui-focusVisible': { backgroundColor: theme.palette.wood.light },
              },
              '&.Mui-focusVisible': {
                outline: `2px solid ${theme.palette.primary.main}`,
                outlineOffset: -3,
              },
            };
          },
        },
      },
      MuiPaper: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: ({ theme }) => {
            return {
              backgroundImage: 'none',
              '&.game-window-surface': windowSurface(theme),
            };
          },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: ({ theme }) => {
            return {
              ...windowSurface(theme),
              fontFamily: theme.typography.fontFamily,
              fontSize: theme.typography.pxToRem(TOOLTIP_STYLE.fontPx),
              padding: theme.spacing(TOOLTIP_STYLE.padding),
              maxWidth: 'min(300px, calc(100vw - 32px))',
            };
          },
          arrow: ({ theme }) => {
            return {
              color: windowSurface(theme).backgroundColor,
              '&::before': { border: `1px solid ${theme.palette.divider}` },
            };
          },
        },
      },
      MuiDialog: { defaultProps: { fullWidth: true, maxWidth: 'sm' } },
      MuiTabs: {
        defaultProps: { variant: 'scrollable', scrollButtons: 'auto' },
        styleOverrides: {
          root: { minHeight: 30, flexShrink: 0 },
          vertical: { width: 'var(--window-tabs-width, 112px)' },
          indicator: { display: 'none' },
        },
      },
      MuiLinearProgress: { styleOverrides: { root: { height: 6, borderRadius: 5 } } },
    },
  });
};

export const gameTheme = createGameTheme();

export function GameUiProvider({
  children,
  fontBaseUrl = '/fonts/',
  font = 'Alegreya Sans',
}: {
  children: ReactNode;
  /** Host asset directory, including a trailing slash. */
  fontBaseUrl?: string;
  font?: GameFont;
}) {
  const [loadedFont, setLoadedFont] = useState('sans-serif');
  const faces = useMemo(() => {
    return fontFaces(fontBaseUrl);
  }, [fontBaseUrl]);
  useEffect(() => {
    let active = true;
    // Load before switching: Pixi caches rasterized text, including fallback glyphs.
    void Promise.all(
      ['400', '500', '700', 'italic 400'].map((weight) => {
        return document.fonts.load(`${weight} 16px "${font}"`);
      }),
    ).then(
      () => {
        if (active) {
          setLoadedFont(`"${font}", sans-serif`);
        }
      },
      () => {
        /* Retain the working font when an asset cannot load. */
      },
    );

    return () => {
      active = false;
    };
  }, [font, fontBaseUrl]);
  const theme = useMemo(() => {
    return createGameTheme(loadedFont);
  }, [loadedFont]);

  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={faces} />
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
