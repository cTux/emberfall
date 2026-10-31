import { PixiContext } from '../packages/client/src/rendering/pixi-context';

import { lightTexture } from '../packages/client/src/village';

export function compareLighting(pixi: PixiContext, gpu: HTMLCanvasElement) {
  const light = { x: 100, y: 100, radius: 80, height: 100, strength: 0.3, owner: 'test' };
  const mask = document.createElement('canvas');
  mask.width = mask.height = 16;
  mask.getContext('2d')!.fillRect(0, 0, 16, 16);
  const caster = { id: 'blocker', x: 120, y: 100, width: 16, height: 16, mask };
  const revision = (canvas: HTMLCanvasElement) =>
    (canvas as HTMLCanvasElement & { textureRevision: number }).textureRevision;
  const first = revision(lightTexture(light, [caster], true));
  const reused = revision(lightTexture(light, [caster], true));
  const translated = revision(lightTexture({ ...light, x: 150 }, [{ ...caster, x: 170 }], true));
  const moved = revision(lightTexture(light, [{ ...caster, x: 140 }], true));
  const toggled = revision(lightTexture(light, [caster], false));
  const lights = { first, reused, translated, moved, toggled };

  pixi.begin();
  pixi.fillStyle = '#000000';
  pixi.fillRect(0, 0, 256, 256);
  pixi.scale(8, 8);
  pixi.font = '12px sans-serif';
  pixi.textBaseline = 'top';
  pixi.fillStyle = '#ffffff';
  pixi.fillText('Pixels', 2, 2);
  pixi.present();
  const glyph = document.createElement('canvas');
  glyph.width = glyph.height = 256;
  const glyphCtx = glyph.getContext('2d')!;
  glyphCtx.drawImage(gpu, 0, 0);
  const pixels = glyphCtx.getImageData(0, 0, 256, 256).data;
  // Linear sampling of a 4x text texture at 8x world scale introduces
  // intermediate columns on both halves of the raster grid.
  const edges = [0, 0];
  for (let y = 0; y < 100; y++)
    for (let x = 1; x < 220; x++)
      if (pixels[(y * 256 + x) * 4] !== pixels[(y * 256 + x - 1) * 4]) edges[x % 2]++;
  glyph.style.imageRendering = 'pixelated';
  document.body.append(glyph);
  return { lights, edges };
}
