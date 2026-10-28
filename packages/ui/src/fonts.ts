export const GAME_FONTS = {
  'Alegreya Sans': 'AlegreyaSans',
  Inter: 'Inter',
  'Source Sans 3': 'SourceSans3',
  'Atkinson Hyperlegible Next': 'AtkinsonHyperlegibleNext',
} as const;

export type GameFont = keyof typeof GAME_FONTS;
