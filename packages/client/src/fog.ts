import type { DrawingContext } from './rendering/drawing-context';

// Existing seamless fog texture uses 36 soft puffs; coprime placement strides avoid visible rows.
const FOG_TEXTURE = {
  size: 512,
  puffs: 36,
  xStride: 137,
  yStride: 211,
  puffRadius: 100,
  puffDiameter: 200,
} as const;
// Two differently sized/drifting layers preserve the approved slow parallax and vertical breathing.
const FOG_LAYERS = {
  count: 2,
  farWidth: 1600,
  nearWidth: 960,
  farHeight: 1280,
  nearHeight: 640,
  driftMs: 100,
  layerDriftMs: 70,
  swayMs: 18000,
  sway: 70,
} as const;

const fogTexture = document.createElement('canvas');
fogTexture.width = fogTexture.height = FOG_TEXTURE.size;
const fogContext = fogTexture.getContext('2d')!;

for (let i = 0; i < FOG_TEXTURE.puffs; i++) {
  for (const offsetX of [-FOG_TEXTURE.size, 0, FOG_TEXTURE.size]) {
    for (const offsetY of [-FOG_TEXTURE.size, 0, FOG_TEXTURE.size]) {
      const x = ((i * FOG_TEXTURE.xStride) % FOG_TEXTURE.size) + offsetX,
        y = ((i * FOG_TEXTURE.yStride) % FOG_TEXTURE.size) + offsetY;
      const gradient = fogContext.createRadialGradient(x, y, 0, x, y, FOG_TEXTURE.puffRadius);
      gradient.addColorStop(0, '#b4cfdc12');
      gradient.addColorStop(1, '#b4cfdc00');
      fogContext.fillStyle = gradient;
      fogContext.fillRect(
        x - FOG_TEXTURE.puffRadius,
        y - FOG_TEXTURE.puffRadius,
        FOG_TEXTURE.puffDiameter,
        FOG_TEXTURE.puffDiameter,
      );
    }
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
  for (let layer = 0; layer < FOG_LAYERS.count; layer++) {
    const tileWidth = layer ? FOG_LAYERS.farWidth : FOG_LAYERS.nearWidth,
      tileHeight = layer ? FOG_LAYERS.farHeight : FOG_LAYERS.nearHeight,
      offsetX = (now / (FOG_LAYERS.driftMs + layer * FOG_LAYERS.layerDriftMs)) % tileWidth,
      offsetY = Math.sin(now / FOG_LAYERS.swayMs + layer) * FOG_LAYERS.sway;

    for (
      let row = Math.floor((y - offsetY) / tileHeight);
      row <= Math.ceil((y + height - offsetY) / tileHeight);
      row++
    ) {
      for (
        let col = Math.floor((x - offsetX) / tileWidth);
        col <= Math.ceil((x + width - offsetX) / tileWidth);
        col++
      ) {
        ctx.drawImage(
          fogTexture,
          col * tileWidth + offsetX,
          row * tileHeight + offsetY,
          tileWidth,
          tileHeight,
        );
      }
    }
  }

  ctx.restore();
}
