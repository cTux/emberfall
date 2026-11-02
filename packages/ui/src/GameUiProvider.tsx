import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CssBaseline, GlobalStyles, ThemeProvider } from '@mui/material';
import type { GameFont } from './fonts';
import { fontFaces } from './font-faces';
import { createGameTheme } from './create-game-theme';

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
