import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { dayNight } from '../packages/client/src/day-night';

export async function sample() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const renderer = new PixiContext(canvas);
  renderer.resize(320, 120);
  await renderer.ready;
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  const paint = sprite.getContext('2d')!;
  paint.fillStyle = '#ffffff';
  paint.fillRect(0, 0, 32, 32);
  const ctx = renderer as unknown as CanvasRenderingContext2D;
  const results = [];
  for (const time of [600000, 2340000, 3000000, 4200000]) {
    renderer.begin();
    renderer.ambientTint = dayNight(time).tint;
    ctx.drawImage(sprite, 0, 0);
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(40, 0, 32, 32);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(sprite, 80, 0);
    ctx.restore();
    renderer.present();
    const capture = document.createElement('canvas');
    capture.width = 320;
    capture.height = 120;
    const pixels = capture.getContext('2d')!;
    pixels.drawImage(canvas, 0, 0);
    results.push([0, 40, 80].map((x) => [...pixels.getImageData(x + 10, 10, 1, 1).data]));
  }
  renderer.destroy();
  return results;
}
