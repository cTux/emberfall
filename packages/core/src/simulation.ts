export {
  TICK_MS,
  PLAYER_ATTACK_RANGE,
  PLAYER_ATTACK_INTERVAL,
  PLAYER_ATTACK_DURATION,
} from './simulation/constants.ts';
export { smoothAttackAngle, nearestEnemyAngle, swordOverlapsEnemy } from './simulation/aim.ts';
export { tickCompanion } from './simulation/companion.ts';
export {
  movePlayer,
  playerAimAngle,
  requestPlayerCast,
  tickPlayerCombat,
} from './simulation/player.ts';
export { stepCombat } from './simulation/forest.ts';
