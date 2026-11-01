import { GAME_FONTS } from './fonts';

// Bundled Alegreya files use CSS's regular, medium and bold weight identifiers.
const ALEGREYA_WEIGHTS = { regular: 400, medium: 500, bold: 700 };

export const fontFaces = (fontBaseUrl: string) => {
  return [
    ...Object.entries(GAME_FONTS)
      .filter(([family]) => {
        return family !== 'Alegreya Sans';
      })
      .flatMap(([family, file]) => {
        return ['normal', 'italic'].map((style) => {
          return {
            '@font-face': {
              fontFamily: family,
              fontStyle: style,
              fontWeight: '400 700',
              fontDisplay: 'swap' as const,
              src: `url('${fontBaseUrl}${file}-${style === 'italic' ? 'Italic' : 'Variable'}.ttf') format('truetype')`,
            },
          };
        });
      }),
    ...Object.values(ALEGREYA_WEIGHTS).map((weight) => {
      return {
        '@font-face': {
          fontFamily: 'Alegreya Sans',
          fontStyle: 'normal' as const,
          fontWeight: weight,
          fontDisplay: 'swap' as const,
          src: `url('${fontBaseUrl}AlegreyaSans-${weight === ALEGREYA_WEIGHTS.regular ? 'Regular' : weight === ALEGREYA_WEIGHTS.medium ? 'Medium' : 'Bold'}.ttf') format('truetype')`,
        },
      };
    }),
    {
      '@font-face': {
        fontFamily: 'Alegreya Sans',
        fontStyle: 'italic' as const,
        fontWeight: 400,
        fontDisplay: 'swap' as const,
        src: `url('${fontBaseUrl}AlegreyaSans-Italic.ttf') format('truetype')`,
      },
    },
  ];
};
