import type { WorldState } from '@emberfall/common';

/** Detached snapshots replace arrays even when their bounded chat history is unchanged. */
export function retainWorldChat(next: WorldState) {
  return (previous: WorldState | null): WorldState => {
    if (previous?.id === next.id && JSON.stringify(previous.chat) === JSON.stringify(next.chat)) {
      return { ...next, chat: previous.chat };
    }

    return next;
  };
}
