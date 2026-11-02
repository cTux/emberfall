import type { Tactics } from '@emberfall/core/contracts';

export type TacticsPriority = Tactics['offensive'][number] | Tactics['defensive'][number];
