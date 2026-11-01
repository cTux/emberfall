import type { RefObject } from 'react';
import type { ClientMessage, WorldState } from '@emberfall/common';
import type { Interaction } from './effects';
import type { GraphicsSettings } from './graphics';
import type { Preferences } from './preferences';

export type ArenaProps = {
  world: WorldState | null;
  playerId: string;
  send: (message: ClientMessage) => void;
  graphics: GraphicsSettings;
  preferences: Preferences;
  latency: number | null;
  interaction: RefObject<Interaction | null>;
  onCursorAim: (reader: (() => { aimX: number; aimY: number }) | null) => void;
  onInteract: (source: Interaction) => void;
  onHitpoints: (hp: Record<string, number>) => void;
  onCatSpeech: (text: string) => void;
};

// With no pointer sample, aim at the viewport midpoint rather than its top-left corner.
export const VIEWPORT_MIDPOINT = 0.5;
