import { useEffect, type Dispatch, type SetStateAction } from 'react';
import type { Preferences } from './preferences';
import type { GameMenu } from './game-panels';

export function useGameHotkeys({
  world,
  menu,
  setMenu,
  setPreferences,
  castTalent,
  interact,
}: {
  world: boolean;
  menu: GameMenu | null;
  setMenu: (menu: GameMenu | null) => void;
  setPreferences: Dispatch<SetStateAction<Preferences>>;
  castTalent: (slot: number) => void;
  interact: () => void;
}) {
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.code === 'F1') event.preventDefault();
      if (event.repeat) return;
      const typing =
        event.target instanceof Element &&
        !!event.target.closest('input, textarea, select, [contenteditable=true]');
      if (
        event.code === 'KeyT' &&
        world &&
        !typing &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (menu === 'tactics' ||
          (!menu && !document.querySelector('[role="dialog"][aria-modal="true"]')))
      ) {
        event.preventDefault();
        setMenu(menu === 'tactics' ? null : 'tactics');

        return;
      }

      if (
        event.code === 'KeyN' &&
        world &&
        !typing &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        (!menu || menu === 'talents')
      ) {
        event.preventDefault();
        setMenu(menu === 'talents' ? null : 'talents');

        return;
      }

      if (
        /^Digit[1-4]$/.test(event.code) &&
        world &&
        !typing &&
        (!menu || menu === 'talents') &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey
      ) {
        event.preventDefault();
        castTalent(Number(event.code.slice(-1)) - 1);

        return;
      }

      if (event.key === 'Escape' && menu === 'talents') {
        event.preventDefault();
        setMenu(null);

        return;
      }

      if (
        event.code === 'KeyI' &&
        world &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        !typing &&
        (menu === 'equipment' ||
          (!menu && !document.querySelector('[role="dialog"][aria-modal="true"]')))
      ) {
        event.preventDefault();
        setMenu(menu === 'equipment' ? null : 'equipment');

        return;
      }

      if (
        world &&
        !menu &&
        !typing &&
        !document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        const option =
          event.code === 'KeyF' ? 'autoAttack' : event.code === 'KeyG' ? 'autoTarget' : null;
        if (option) {
          event.preventDefault();
          setPreferences((p) => ({ ...p, [option]: !p[option] }));
        }
      }

      if (
        (event.code === 'F1' || event.key === 'Escape') &&
        !typing &&
        !event.ctrlKey &&
        !event.altKey &&
        !event.metaKey &&
        !event.shiftKey &&
        ((event.code === 'F1' && menu === 'codex') ||
          (!menu && !document.querySelector('[role="dialog"][aria-modal="true"]')))
      ) {
        event.preventDefault();
        setMenu(event.code === 'F1' ? (menu === 'codex' ? null : 'codex') : 'settings');

        return;
      }

      if (
        event.code === 'KeyE' &&
        !menu &&
        !document.querySelector('[role="dialog"][aria-modal="true"]') &&
        !typing
      )
        interact();
    };

    window.addEventListener('keydown', key);

    return () => window.removeEventListener('keydown', key);
  });
}
