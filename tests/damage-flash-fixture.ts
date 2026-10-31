import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { drawDamageFlash } from '../packages/client/src/effects';
import type { WorldState } from '../packages/common/src/index';

export async function compare() {
  const gpu = document.createElement('canvas');
  const reference = document.createElement('canvas');
  reference.width = reference.height = 32;
  document.body.append(gpu, reference);
  const pixi = new PixiContext(gpu);
  pixi.resize(32, 32);
  await pixi.ready;
  const canvas = reference.getContext('2d')!;
  const capture = document.createElement('canvas').getContext('2d')!;
  try {
    return [-1, 0, 140, 279.9995, 280, 281].map((age) => {
      pixi.begin();
      canvas.reset();
      const alphas: number[] = [];

      for (const ctx of [pixi as unknown as CanvasRenderingContext2D, canvas]) {
        ctx.fillStyle = '#809060';
        ctx.fillRect(0, 0, 32, 32);
        ctx.globalAlpha = 0.5;
        drawDamageFlash(
          ctx,
          {
            serverNow: 1000 + age,
            scene: { damage: [{ target: 'player', at: 1000 }] },
          } as unknown as WorldState,
          'player',
        );
        alphas.push(ctx.globalAlpha);
      }

      pixi.present();
      capture.drawImage(gpu, 0, 0);

      return {
        age,
        alphas,
        actual: [...capture.getImageData(16, 16, 1, 1).data],
        expected: [...canvas.getImageData(16, 16, 1, 1).data],
      };
    });
  } finally {
    pixi.destroy();
  }
}
