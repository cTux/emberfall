import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { softenArtTones } from '../packages/client/src/art-tones';

export async function compareFiltering() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const renderer = new PixiContext(canvas);
  renderer.resize(128, 64);
  await renderer.ready;
  const source = document.createElement('canvas');
  source.width = 2;
  source.height = 1;
  const ctx = source.getContext('2d')!;
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, 1, 1);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(1, 0, 1, 1);
  const samples = [];

  for (const smooth of [false, true, false]) {
    renderer.begin();
    renderer.imageSmoothingEnabled = smooth;
    renderer.save();
    renderer.imageSmoothingEnabled = !smooth;
    renderer.restore();
    renderer.drawImage(source, 0, 0, 128, 64);
    renderer.present();
    const copy = document.createElement('canvas');
    copy.width = 128;
    copy.height = 64;
    const capture = copy.getContext('2d')!;
    capture.drawImage(canvas, 0, 0);
    samples.push([...capture.getImageData(60, 32, 1, 1).data]);
    document.body.append(copy);
  }

  // A logical one-pixel cell must crop two backing pixels, even on a cached source.
  const atlas = document.createElement('canvas');
  atlas.width = 4;
  atlas.height = 2;
  const art = atlas.getContext('2d')!;
  art.fillStyle = '#ff0000';
  art.fillRect(0, 0, 2, 2);
  art.fillStyle = '#0000ff';
  art.fillRect(2, 0, 1, 2);
  art.fillStyle = '#ffffff';
  art.fillRect(3, 0, 1, 2);
  const image = new Image();
  image.src = atlas.toDataURL();
  image.dataset.artResolution = '2';
  await image.decode();
  renderer.begin();
  renderer.imageSmoothingEnabled = false;
  renderer.drawImage(image, 1, 0, 1, 1, 0, 0, 128, 64);
  renderer.present();
  const capture = document.createElement('canvas');
  capture.width = 128;
  capture.height = 64;
  const pixels = capture.getContext('2d')!;
  pixels.drawImage(canvas, 0, 0);
  samples.push([...pixels.getImageData(10, 32, 1, 1).data]);
  samples.push([...pixels.getImageData(100, 32, 1, 1).data]);
  renderer.destroy();

  // Show the same source artwork before and after the tone transform, at game scale.
  for (const name of ['environment', 'mage-atlas', 'warrior-atlas']) {
    const source = new Image();
    source.src = `/assets/wardrobe-style/${name}.png`;
    await source.decode();
    const original = document.createElement('canvas');
    original.width = source.width;
    original.height = source.height;
    const context = original.getContext('2d')!;
    context.drawImage(source, 0, 0);
    const softened = document.createElement('canvas');
    softened.width = source.width;
    softened.height = source.height;
    const pixels = context.getImageData(0, 0, source.width, source.height);
    softenArtTones(pixels.data, pixels.width, pixels.height);
    softened.getContext('2d')!.putImageData(pixels, 0, 0);
    const row = document.createElement('div');
    row.style.background = '#777d49';
    row.append(`${name}: original / softer tones`);

    for (const image of [original, softened]) {
      image.style.position = 'static';
      image.style.width = name === 'environment' ? '384px' : '256px';
      image.style.height = 'auto';
      row.append(image);
    }

    document.body.append(row);
  }

  return samples;
}
