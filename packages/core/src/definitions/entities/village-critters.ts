import type { CritterKind } from './critter-kind.ts';
import { setting } from '../../content/views.ts';

export const VILLAGE_CRITTERS = setting<
  typeof import('../../mods/base/entities/critters.ts').VILLAGE_CRITTERS
>('villageCritters') as { x: number; y: number; kind: CritterKind }[];
