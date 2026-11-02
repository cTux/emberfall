import type { Messages } from './messages.ts';
import type { CommandType } from './command-type.ts';
import { handlers } from './handlers-definition.ts';
import type { ClientMessage } from '@emberfall/core/contracts';

export function isCharacterCommand(message: ClientMessage): message is Messages[CommandType] {
  return Object.hasOwn(handlers, message.type);
}
