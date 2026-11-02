import { SimulationWorld } from './simulation-world.ts';
import { owners } from './owners.ts';

export function createPlayers() {
  const owner = new SimulationWorld();
  owners.set(owner.players, owner);

  return owner.players;
}
