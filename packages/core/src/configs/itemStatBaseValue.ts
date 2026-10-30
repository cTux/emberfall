import { ItemStat } from '../enums/items.ts';
export const itemStatBaseValue: Readonly<Record<ItemStat, number>> = {
  attackSpeed: 2,
  dotSpeed: 2,
  criticalChance: 2,
  criticalDamage: 10,
  power: 1,
  armor: 1,
  maximumHealth: 5,
  goldIncrease: 10,
  expIncrease: 20,
  movementSpeed: 3,
  moreProjectiles: 1,
  projectilesBounce: 1,
  projectilePierce: 1,
  additionalAttack: 1,
  areaOfEffect: 10,
  range: 10,
};
