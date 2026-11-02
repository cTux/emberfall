import type { ChatMessage, ClientMessage } from '@emberfall/core/contracts';

export type Session = {
  worldId?: string;
  scene?: string;
  messages: ChatMessage[];
  isVisible: (message: ChatMessage) => boolean;
  send: (message: ClientMessage) => void;
  disabled: boolean;
};
