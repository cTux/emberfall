import type { ClientMessage } from '@emberfall/common';

export type CastRequest = Extract<ClientMessage, { type: 'cast' }>;
