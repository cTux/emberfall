export const ItemStat = {
  AttackSpeed: 'attackSpeed',
  DotSpeed: 'dotSpeed',
  CriticalChance: 'criticalChance',
  CriticalDamage: 'criticalDamage',
  Power: 'power',
  Armor: 'armor',
  MaximumHealth: 'maximumHealth',
  GoldIncrease: 'goldIncrease',
  ExpIncrease: 'expIncrease',
  MovementSpeed: 'movementSpeed',
  MoreProjectiles: 'moreProjectiles',
  ProjectilesBounce: 'projectilesBounce',
  ProjectilePierce: 'projectilePierce',
  AdditionalAttack: 'additionalAttack',
  AreaOfEffect: 'areaOfEffect',
  Range: 'range',
} as const;
export type ItemStat = (typeof ItemStat)[keyof typeof ItemStat];

export const Rarity = {
  Common: 'common',
  Uncommon: 'uncommon',
  Rare: 'rare',
  Epic: 'epic',
  Legendary: 'legendary',
} as const;
export type Rarity = (typeof Rarity)[keyof typeof Rarity];
