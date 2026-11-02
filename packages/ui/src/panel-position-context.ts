import type { PanelPosition } from './panel-position.ts';
import { createContext } from 'react';

export const PanelPositionContext = createContext<{
  load(key: string): PanelPosition;
  save(key: string, position: PanelPosition): void;
} | null>(null);
