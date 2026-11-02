import type { BrowserSelection } from './browser-selection-contract.ts';
import { fullGroups } from './full-groups.ts';

export const full = (reason: string): BrowserSelection => {
  return {
    groups: [...fullGroups],
    ui: true,
    full: true,
    reason,
  };
};
