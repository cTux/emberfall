import { randomSource } from './random.ts';
import { Rarity } from './enums/items.ts';
import { PERCENT } from '@emberfall/common';
import { rarityDropChance } from './configs/rarityDropChance.ts';

export function rollRarity(random = randomSource.next, multiplier = 1): Rarity {
  let roll = random() * PERCENT;

  for (const [rarity, chance] of Object.entries(rarityDropChance)) {
    if (rarity === Rarity.Common || roll < chance * multiplier) {
      return rarity as Rarity;
    }

    roll -= chance * multiplier;
  }

  return Rarity.Common;
}
