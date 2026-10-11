import { isChanced } from "./isChanced.ts";

export function isMultiChanced(percent: number): number {
  if (percent <= 0 || Number.isNaN(percent)) return 0;
  return Math.floor(percent / 100) + (isChanced(percent % 100) ? 1 : 0);
}
