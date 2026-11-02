import type { createForestActors } from './create-forest-actors.ts';

export type ForestActor = ReturnType<ReturnType<typeof createForestActors>>['rendered'][number];
