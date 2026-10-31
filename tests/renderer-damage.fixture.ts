import type { PixiContext } from '../packages/client/src/rendering/pixi-context';

import { drawDamageNumber, drawDamageNumbers } from '../packages/client/src/damage-text';

export function compareDamage(pixi: PixiContext, gpu: HTMLCanvasElement) {
  pixi.begin();
  pixi.fillStyle = '#17251d';
  pixi.fillRect(0, 0, 256, 256);
  for (const [index, damageType] of (['physical', 'fire', 'poison', 'nature'] as const).entries()) {
    for (const critical of [false, true])
      drawDamageNumber(
        pixi,
        { id: index, x: 0, y: 0, amount: 15, at: 1000, target: 'enemy:1', damageType, critical },
        { x: 32 + index * 64, y: critical ? 120 : 70 },
        1000,
      );
  }
  pixi.present();
  const damagePreview = document.createElement('canvas');
  damagePreview.width = damagePreview.height = 256;
  damagePreview.style.width = '512px';
  damagePreview.style.imageRendering = 'pixelated';
  const damageContext = damagePreview.getContext('2d')!;
  damageContext.drawImage(gpu, 0, 0);
  document.body.append(damagePreview);
  const damagePixels = Array.from({ length: 4 }, (_, index) => {
    const pixels = damageContext.getImageData(index * 64, 50, 64, 50).data;
    let white = 0,
      red = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 235 && pixels[i + 1] > 235 && pixels[i + 2] > 235) white++;
      if (pixels[i] > 150 && pixels[i + 1] < 90 && pixels[i + 2] < 110) red++;
    }
    return { white, red };
  });
  pixi.begin();
  pixi.fillStyle = '#17251d';
  pixi.fillRect(0, 0, 256, 256);
  const groupedLabels: string[] = [];
  const fillText = pixi.fillText.bind(pixi);
  pixi.fillText = (text, x, y) => {
    groupedLabels.push(String(text));
    fillText(text, x, y);
  };
  drawDamageNumbers(
    pixi,
    [
      {
        id: 1,
        ownerId: 'mage',
        target: 'enemy:1',
        damageType: 'fire',
        amount: 3,
        at: 1000,
        x: 128,
        y: 128,
      },
      {
        id: 2,
        ownerId: 'mage',
        target: 'enemy:1',
        damageType: 'fire',
        amount: 4.5,
        critical: true,
        at: 1010,
        x: 128,
        y: 128,
      },
      ...[0.2, 0].map((amount, index) => ({
        id: 3 + index,
        ownerId: 'mage',
        target: `enemy:${2 + index}`,
        amount,
        at: 1010,
        x: 64,
        y: 128,
      })),
    ],
    (x, y) => ({ x, y }),
    1010,
  );
  pixi.fillText = fillText;
  pixi.present();
  return { damagePixels, groupedLabels };
}
