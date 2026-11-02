import type { Group } from './group.ts';

export interface BrowserSelection {
  groups: Group[];
  ui: boolean;
  full: boolean;
  reason: string;
}
