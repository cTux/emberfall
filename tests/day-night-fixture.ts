import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { dayNight } from '../packages/client/src/day-night';
import { castShadow, makeMask } from '../packages/client/src/lighting';
import { wardrobeArt } from '../packages/client/src/art';

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
    results.push(
      [0, 40, 80].map((x) => {
        return [...pixels.getImageData(x + 10, 10, 1, 1).data];
      }),
    );
  }

  renderer.destroy();

  return results;
}

export async function shadows() {
  while (wardrobeArt.dataset.artReady !== 'true') {
    await new Promise((done) => {
      // Poll roughly once per frame while yielding for asynchronous image preparation.
      const ART_POLL_INTERVAL_MS = 20;

      return setTimeout(done, ART_POLL_INTERVAL_MS);
    });
  }

  await wardrobeArt.decode();
  const canvas = document.createElement('canvas');
  document.body.replaceChildren(canvas);
  const renderer = new PixiContext(canvas);
  renderer.resize(1200, 340);
  await renderer.ready;
  const ctx = renderer as unknown as CanvasRenderingContext2D;
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = wardrobeArt.naturalHeight;
  maskCanvas.height = wardrobeArt.naturalHeight;
  maskCanvas.getContext('2d')!.drawImage(wardrobeArt, 0, 0);
  const mask = makeMask(maskCanvas);
  renderer.begin();
  const frames = [];

  for (const [index, phase] of [0.1, 0.35, 0.6, 0.85].entries()) {
    const cycle = dayNight(phase * 3600000);
    renderer.ambientTint = cycle.tint;
    renderer.directionalShadow = cycle.shadow;
    const x = 150 + index * 300;
    ctx.fillStyle = '#66744d';
    ctx.fillRect(index * 300, 0, 300, 340);
    castShadow(ctx, { id: 'wardrobe', x, y: 210, width: 90, height: 96, mask });
    ctx.drawImage(maskCanvas, x - 45, 114, 90, 96);
    ctx.fillStyle = '#ffffff';
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(['Morning sun', 'Midday sun', 'Evening sun', 'Midnight moon'][index], x, 35);
  }

  renderer.present();
  const capture = document.createElement('canvas');
  capture.width = canvas.width;
  capture.height = canvas.height;
  const pixels = capture.getContext('2d')!;
  pixels.drawImage(canvas, 0, 0);

  for (let i = 0; i < 4; i++) {
    const data = pixels.getImageData(i * 300, 210, 300, 100).data;
    let left = 0,
      right = 0;

    for (let y = 0; y < 100; y++) {
      for (let x = 0; x < 300; x++) {
        if (data[(y * 300 + x) * 4] < 95) {
          if (x < 110) {
            left++;
          }

          if (x > 190) {
            right++;
          }
        }
      }
    }

    frames.push({ left, right });
  }

  return frames;
}
