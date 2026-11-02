import { owners } from './owners.ts';
import type { Player } from '@emberfall/common';

export function simulationFor(players: Map<string, Player>) {
  return owners.get(players);
}
