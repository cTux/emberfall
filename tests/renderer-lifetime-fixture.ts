import { PixiContext } from '../packages/client/src/rendering/pixi-context';

export async function resizeAndDispose() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const context = new PixiContext(canvas);
  await context.ready;
  const pixels: number[][] = [];

  for (const [width, height] of [
    [173, 137],
    [211, 159],
    [173, 137],
  ]) {
    context.resize(width, height);
    context.begin();
    context.fillStyle = '#809060';
    context.fillRect(0, 0, width, height);
    context.globalCompositeOperation = 'soft-light';
    context.fillStyle = '#b4cfdc';
    context.fillRect(0, 0, width, height);
    context.present();
    const capture = document.createElement('canvas');
    capture.width = width;
    capture.height = height;
    const output = capture.getContext('2d')!;
    output.drawImage(canvas, 0, 0);
    pixels.push([...output.getImageData(20, 20, 1, 1).data]);
    document.body.append(capture);
  }

  context.destroy();

  return pixels;
}
