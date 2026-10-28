import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { drawClassProjectiles, talentCastArt } from '../packages/client/src/combat-effects';
import type { SceneState } from '../packages/common/src/index';
export async function render() {
  await talentCastArt.decode();
  const gpu = document.createElement('canvas');
  document.body.append(gpu);
  const pixi = new PixiContext(gpu);
  pixi.resize(256, 256);
  await pixi.ready;
  const preview = document.createElement('canvas');
  preview.width = 768;
  preview.height = 1024;
  preview.dataset.preview = 'talent-casts';
  const ctx = preview.getContext('2d')!;
  const counts: number[] = [];
  for (const [classIndex, classId] of ['warrior', 'ranger', 'mage', 'druid'].entries()) {
    for (let column = 0; column < 3; column++) {
      pixi.begin();
      pixi.fillStyle = '#000000';
      pixi.fillRect(0, 0, 256, 256);
      drawClassProjectiles(
        pixi as unknown as CanvasRenderingContext2D,
        {
          id: 'talent-preview',
          type: 'Forest',
          difficulty: 'Easy',
          phase: 'active',
          enemies: [],
          damage: [],
          portals: [],
          sequence: 1,
          nextSpawn: 0,
          ready: [],
          countdownAt: null,
          endsAt: null,
          playerShots: [],
          explosions: [
            {
              id: 1,
              x: 128,
              y: 128,
              at: 500,
              durationMs: 1000,
              talentClass: classId,
              talentColumn: column,
            },
          ],
        } satisfies SceneState,
        1000,
        (x, y) => ({ x, y }),
        false,
      );
      pixi.present();
      ctx.drawImage(gpu, column * 256, classIndex * 256);
      const pixels = ctx.getImageData(column * 256, classIndex * 256, 256, 256).data;
      let painted = 0;
      for (let index = 0; index < pixels.length; index += 4)
        if (pixels[index] + pixels[index + 1] + pixels[index + 2] > 30) painted++;
      counts.push(painted);
    }
  }
  document.body.append(preview);
  pixi.destroy();
  gpu.remove();
  return counts;
}
