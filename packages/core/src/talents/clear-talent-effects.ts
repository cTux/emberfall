import { fighters } from './fighters.ts';
import { generations } from './generations.ts';
import type { Player } from '@emberfall/core/contracts';

export function clearTalentEffects(player: Player) {
  fighters.delete(player);
  generations.set(player, (generations.get(player) ?? 0) + 1);
}
