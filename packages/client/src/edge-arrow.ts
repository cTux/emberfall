import { NAVIGATION_LAYOUT } from './navigation-layout.ts';

export function edgeArrow(x: number, y: number, width: number, height: number) {
  if (x >= 0 && x <= width && y >= 0 && y <= height) {
    return null;
  }

  const dx = x - width / 2,
    dy = y - height / 2;
  const ratio = Math.min(
    (width / 2 - NAVIGATION_LAYOUT.edgeInset) / Math.abs(dx),
    (height / 2 - NAVIGATION_LAYOUT.edgeInset) / Math.abs(dy),
  );

  return { x: width / 2 + dx * ratio, y: height / 2 + dy * ratio, angle: Math.atan2(dy, dx) };
}
