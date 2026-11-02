import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface HudAction {
  id: string;
  label: string;
  shortcut?: string;
  icon: IconDefinition;
  disabled?: boolean;
  onClick: () => void;
}
