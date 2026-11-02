import type { CastRequest } from './cast-request.ts';
import type { Player } from '@emberfall/common';

export const castInputs = new WeakMap<Player, CastRequest>();
