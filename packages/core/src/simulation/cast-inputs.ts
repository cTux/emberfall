import type { CastRequest } from './cast-request.ts';
import type { Player } from '@emberfall/core/contracts';

export const castInputs = new WeakMap<Player, CastRequest>();
