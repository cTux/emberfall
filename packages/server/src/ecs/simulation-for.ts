import { owners } from './owners.ts';
import type { Player } from '@emberfall/core/contracts';

export function simulationFor(players: Map<string, Player>) {
  return owners.get(players);
}
