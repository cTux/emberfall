import type { ClientMessage } from '@emberfall/core/contracts';

export type CastRequest = Extract<ClientMessage, { type: 'cast' }>;
