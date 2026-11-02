import { VILLAGE_DEFINITION } from './definitions/worlds/village.ts';

export const ANVIL = VILLAGE_DEFINITION.workstations.find((station) => {
  return station.id === 'workshop-anvil';
});
