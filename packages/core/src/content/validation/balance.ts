import type { ValidationContext } from './context.ts';

export function validateBalance(context: ValidationContext) {
  const { r, check, positive, nonnegative } = context;

  for (const type of r.enemyTypes.values()) {
    check(
      ['normal', 'elite', 'boss'].includes(type.id) &&
        positive(type.multiplier) &&
        nonnegative(type.dropChance) &&
        type.dropChance <= 100 &&
        (typeof type.dropCount === 'number'
          ? nonnegative(type.dropCount)
          : nonnegative(type.dropCount.min) &&
            nonnegative(type.dropCount.max) &&
            type.dropCount.min <= type.dropCount.max),
      'enemyTypes',
      type.id,
      'unsupported type or invalid balance',
    );
  }

  for (const difficulty of r.difficulties.values()) {
    check(
      ['Easy', 'Medium', 'Hard'].includes(difficulty.id) &&
        positive(difficulty.multiplier) &&
        positive(difficulty.speedMultiplier),
      'difficulties',
      difficulty.id,
      'unsupported difficulty or invalid multiplier',
    );
  }
}
