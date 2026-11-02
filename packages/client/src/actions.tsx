import type { ClientMessage } from '@emberfall/common';

export type Actions = {
  unavailable: boolean;
  send: (message: ClientMessage) => void;
  onClose: () => void;
};
