import { VILLAGE_DEFINITION } from './definitions/worlds/village.ts';

export const BULLSEYE = VILLAGE_DEFINITION.workstations.find((station) => {
  return station.id === 'lodge-target';
});
