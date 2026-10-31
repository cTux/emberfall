import { useEffect, useState } from 'react';
import type { Preferences } from './preferences';
import { loadGraphics } from './graphics';

export function useGamePreferences(
  preferences: Preferences,
  steam: boolean,
  nickname: string | null,
) {
  const [legacyName, setName] = useState(() => {
    try {
      return localStorage.getItem('emberfall-new.nickname')?.slice(0, 24) || 'Wanderer';
    } catch {
      return 'Wanderer';
    }
  });
  const name = steam ? nickname! : legacyName;
  useEffect(() => {
    document.body.dataset.customCursor = String(preferences.customCursor);
    document.body.dataset.cursorSize = String(preferences.cursorSize);
    try {
      localStorage.setItem('emberfall-new.preferences', JSON.stringify(preferences));
    } catch {
      /* Session preferences still apply. */
    }
  }, [preferences]);
  const [graphics, setGraphics] = useState(loadGraphics);
  useEffect(() => {
    try {
      localStorage.setItem('emberfall-new.graphics', JSON.stringify(graphics));
    } catch {
      /* Settings still apply to this session. */
    }
  }, [graphics]);
  useEffect(() => {
    try {
      if (!steam) {
        localStorage.setItem('emberfall-new.nickname', name);
      }
    } catch {
      /* Storage may be disabled. */
    }
  }, [name, steam]);

  return { name, setName, graphics, setGraphics };
}
