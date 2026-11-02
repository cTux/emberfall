import type { CommandType } from './command-type.ts';
import type { ClientMessage } from '@emberfall/core/contracts';

export type Messages = { [K in CommandType]: Extract<ClientMessage, { type: K }> };
