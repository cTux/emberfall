import { game } from '../game.ts';
export const enemyTypeSpawnChance = Object.freeze({
  elite: game.registries.enemyTypes.require('elite').spawnChance!,
  normal: game.registries.enemyTypes.require('normal').spawnChance!,
});
