export function isChanced(percent: number, random = Math.random): boolean {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  return random() * 100 < percent;
}
