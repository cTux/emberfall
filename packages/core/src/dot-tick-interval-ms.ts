import type { EquipmentOwner, CharacterStats } from './content/rules.ts';
import { game } from './game.ts';
import { recoveryCooldownMs } from './utils/recoveryCooldownMs.ts';
import { PERCENT } from '@emberfall/common';

export function dotTickIntervalMs(
  player: EquipmentOwner,
  baseMs: number,
  stats: CharacterStats = game.rules.characterStats(player),
) {
  return recoveryCooldownMs(baseMs, stats.bonuses.dotSpeed / PERCENT);
}
