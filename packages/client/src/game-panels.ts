import type { GameWindowProps } from '@emberfall/ui';

// Inventory/trade/storage share the existing 520-pixel content width so switching services does not change slot layout.
const INVENTORY_WINDOW_WIDTH = 520;

export type GameMenu =
  | 'resetTalents'
  | 'talents'
  | 'tactics'
  | 'codex'
  | 'settings'
  | 'portal'
  | 'building'
  | 'wardrobe'
  | 'equipment'
  | 'exit';
type Panel = Pick<GameWindowProps, 'title' | 'width' | 'height' | 'modal'>;
const panels: Record<GameMenu, Panel> = {
  resetTalents: { title: 'Reset talent points?' },
  talents: { title: 'Talents', width: 700, modal: false },
  tactics: { title: 'Tactics', width: 460, height: 480 },
  codex: { title: 'Codex', height: 480 },
  equipment: { title: 'Inventory', width: INVENTORY_WINDOW_WIDTH },
  settings: { title: 'Settings', height: 420 },
  portal: { title: 'Forest portal' },
  wardrobe: { title: 'Wardrobe', width: 600 },
  exit: { title: 'Leave?' },
  building: { title: '' },
};

export function gamePanel(menu: GameMenu, building: string, trading: boolean): Panel {
  const panel = panels[menu];

  return menu === 'building'
    ? {
        ...panel,
        title: building,
        width: trading || building === 'Storehouse' ? INVENTORY_WINDOW_WIDTH : undefined,
      }
    : panel;
}
