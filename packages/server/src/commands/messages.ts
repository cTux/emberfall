import type { CommandType } from './command-type.ts';
import type { ClientMessage } from '@emberfall/common';

export type Messages = { [K in CommandType]: Extract<ClientMessage, { type: K }> };
