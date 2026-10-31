import { createArenaInput } from './arena-input';
import type { ArenaPresentation } from './arena-presentation';
import type { useArenaState } from './useArenaState';

export function createPresentationInput(
  element: HTMLCanvasElement,
  playerId: string,
  presentation: ArenaPresentation,
  {
    latest,
    prefs,
    sender,
    activate,
  }: Pick<ReturnType<typeof useArenaState>, 'latest' | 'prefs' | 'sender' | 'activate'>,
) {
  return createArenaInput({
    element,
    world: () => {
      return latest.current;
    },
    player: () => {
      return latest.current?.players.find((p) => {
        return p.id === playerId;
      });
    },
    preferences: () => {
      return prefs.current;
    },
    send: (message) => {
      return sender.current(message);
    },
    activate: (source) => {
      return activate.current(source);
    },
    move: (x, y, now) => {
      return presentation.input(x, y, now);
    },
  });
}
