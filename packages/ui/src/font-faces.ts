import { GAME_FONTS } from './fonts';

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
    ...[400, 500, 700].map((weight) => {
      return {
        '@font-face': {
          fontFamily: 'Alegreya Sans',
          fontStyle: 'normal' as const,
          fontWeight: weight,
          fontDisplay: 'swap' as const,
          src: `url('${fontBaseUrl}AlegreyaSans-${weight === 400 ? 'Regular' : weight === 500 ? 'Medium' : 'Bold'}.ttf') format('truetype')`,
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
