import { HIT_STYLE } from './hit-style.ts';
// Eight authored offsets dilate the silhouette around its center before subtraction.
const OUTLINE_OFFSETS = [
  [0, 2],
  [4, 2],
  [2, 0],
  [2, 4],
  [1, 1],
  [3, 3],
  [1, 3],
  [3, 1],
];
export function hitOutline(
  mask: HTMLCanvasElement,
  color = '#ff3737',
  radius: number = HIT_STYLE.outlineRadius,
) {
  const outline = document.createElement('canvas');
  outline.width = mask.width + radius * 2;
  outline.height = mask.height + radius * 2;
  const c = outline.getContext('2d')!;

  for (const [x, y] of OUTLINE_OFFSETS) {
    c.drawImage(mask, (x * radius) / 2, (y * radius) / 2);
  }

  c.globalCompositeOperation = 'source-in';
  c.fillStyle = color;
  c.fillRect(0, 0, outline.width, outline.height);
  c.globalCompositeOperation = 'destination-out';
  c.drawImage(mask, radius, radius);

  return outline;
}
