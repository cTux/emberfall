export function isChanced(percent: number): boolean {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  return Math.random() * 100 < percent;
}
