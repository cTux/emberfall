import type { PixiContext } from '../packages/client/src/rendering/pixi-context';

import { drawDamageNumber } from '../packages/client/src/damage-text';

export function compareBattleText(pixi: PixiContext, gpu: HTMLCanvasElement) {
  pixi.resize(850, 260);
  pixi.begin();
  pixi.fillStyle = '#17251d';
  pixi.fillRect(0, 0, 850, 260);
  const ages = [0, 80, 220, 600, 750];

  for (const [index, age] of ages.entries()) {
    for (const critical of [false, true]) {
      drawDamageNumber(
        pixi,
        { id: 2, x: 0, y: 0, amount: 125, at: 1000, target: 'enemy:1', critical },
        { x: 85 + index * 170, y: critical ? 250 : 120 },
        1000 + age,
      );
    }
  }

  pixi.present();
  const battlePreview = document.createElement('canvas');
  battlePreview.width = 850;
  battlePreview.height = 260;
  battlePreview.dataset.preview = 'battle-text';
  const battleContext = battlePreview.getContext('2d')!;
  battleContext.drawImage(gpu, 0, 0);
  document.body.append(battlePreview);
  const battleTextPixels = [false, true].map((critical) => {
    return ages.map((age, index) => {
      const pixels = battleContext.getImageData(index * 170, critical ? 130 : 0, 170, 130).data;
      let count = 0,
        top = 130,
        bottom = 0;

      for (let y = 0; y < 130; y++) {
        for (let x = 0; x < 170; x++) {
          const offset = (y * 170 + x) * 4;

          if (
            Math.abs(pixels[offset] - 23) +
              Math.abs(pixels[offset + 1] - 37) +
              Math.abs(pixels[offset + 2] - 29) >
            30
          ) {
            count++;
            top = Math.min(top, y);
            bottom = Math.max(bottom, y);
          }
        }
      }

      return { age, count, top, height: count ? bottom - top + 1 : 0 };
    });
  });

  return battleTextPixels;
}
