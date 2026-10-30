import type { Rarity } from '../enums/items.ts';
export const rarityColor: Readonly<Record<Rarity, string>> = {
  common: '#ffffff',
  uncommon: '#1eff00',
  rare: '#0070dd',
  epic: '#a335ee',
  legendary: '#ff8000',
};
