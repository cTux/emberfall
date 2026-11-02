import type { ClientMessage } from '@emberfall/core/contracts';

export type Actions = { unavailable: boolean; send: (message: ClientMessage) => void };
