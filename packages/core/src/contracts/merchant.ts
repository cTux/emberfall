import type { BackpackItem } from './backpack-item.ts';

export interface Merchant {
  craftsman?: Merchant;
  refreshAt?: number;
  coins: number;
  backpack: BackpackItem[];
  buyback: BackpackItem[];
}
