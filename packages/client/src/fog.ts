import type { DrawingContext } from './rendering/drawing-context';

const fogTexture = document.createElement('canvas');
fogTexture.width = fogTexture.height = 512;
const fogContext = fogTexture.getContext('2d')!;
for (let i = 0; i < 36; i++) {
  for (const offsetX of [-512, 0, 512])
    for (const offsetY of [-512, 0, 512]) {
      const x = ((i * 137) % 512) + offsetX,
        y = ((i * 211) % 512) + offsetY;
      const gradient = fogContext.createRadialGradient(x, y, 0, x, y, 100);
      gradient.addColorStop(0, '#b4cfdc12');
      gradient.addColorStop(1, '#b4cfdc00');
      fogContext.fillStyle = gradient;
      fogContext.fillRect(x - 100, y - 100, 200, 200);
    }
}

export function drawFog(
  ctx: DrawingContext,
  x: number,
  y: number,
  width: number,
  height: number,
  now: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  // World-space tiles: the camera only selects which volumes to draw.
  for (let layer = 0; layer < 2; layer++) {
    const tileWidth = layer ? 1600 : 960,
      tileHeight = layer ? 1280 : 640,
      offsetX = (now / (100 + layer * 70)) % tileWidth,
      offsetY = Math.sin(now / 18000 + layer) * 70;
    for (
      let row = Math.floor((y - offsetY) / tileHeight);
      row <= Math.ceil((y + height - offsetY) / tileHeight);
      row++
    )
      for (
        let col = Math.floor((x - offsetX) / tileWidth);
        col <= Math.ceil((x + width - offsetX) / tileWidth);
        col++
      )
        ctx.drawImage(
          fogTexture,
          col * tileWidth + offsetX,
          row * tileHeight + offsetY,
          tileWidth,
          tileHeight,
        );
  }

  ctx.restore();
}
