import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { drawClassProjectiles, talentCastArt } from '../packages/client/src/combat-effects';
import { drawPlayerAttack } from '../packages/client/src/forest';
import { abilityEffectOpacity } from '../packages/client/src/ability-effects';
import { starterEquipment } from '../packages/core/src/index';
import type { Player, SceneState } from '../packages/common/src/index';

export async function compare() {
  await talentCastArt.decode();
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const pixi = new PixiContext(canvas);
  pixi.resize(256, 256);
  await pixi.ready;
  const sample = document.createElement('canvas');
  sample.width = sample.height = 256;
  const ctx = sample.getContext('2d')!;
  const results: Record<string, number[]> = {};
  for (const kind of [
    'arrow',
    'fireball',
    'roots',
    'explosion',
    'talent-image',
    'talent-particles',
    'swing',
  ]) {
    results[kind] = [];
    for (const [transparency, hide, owner] of [
      [0, false, 'me'],
      [0.5, false, 'me'],
      [1, false, 'me'],
      [0, true, 'other'],
      [0, true, 'me'],
    ] as const) {
      const preferences = { abilityEffectTransparency: transparency, hideOtherPlayerEffects: hide };
      const scene = {
        playerShots: ['arrow', 'fireball', 'roots'].includes(kind)
          ? [{ id: 1, ownerId: owner, kind, x: 128, y: 128, angle: 0 }]
          : [],
        explosions:
          kind.startsWith('talent') || kind === 'explosion'
            ? [
                {
                  id: 1,
                  ownerId: owner,
                  x: 128,
                  y: 128,
                  at: 0,
                  durationMs: 1000,
                  ...(kind.startsWith('talent') ? { talentClass: 'mage', talentColumn: 0 } : {}),
                },
              ]
            : [],
      } as unknown as SceneState;
      pixi.begin();
      pixi.fillStyle = '#000000';
      pixi.fillRect(0, 0, 256, 256);
      drawClassProjectiles(
        pixi as unknown as CanvasRenderingContext2D,
        scene,
        150,
        (x, y) => ({ x, y }),
        kind === 'talent-particles',
        preferences,
        'me',
      );
      if (kind === 'swing')
        drawPlayerAttack(
          pixi as unknown as CanvasRenderingContext2D,
          {
            id: owner,
            classId: 'warrior',
            hitpoints: 100,
            attackAt: 0,
            equipment: starterEquipment('warrior'),
          } as Player,
          128,
          128,
          150,
          true,
          true,
          abilityEffectOpacity(preferences, 'me', owner),
        );
      pixi.present();
      ctx.drawImage(canvas, 0, 0);
      const pixels = ctx.getImageData(0, 0, 256, 256).data;
      let brightness = 0;
      for (let i = 0; i < pixels.length; i += 4)
        brightness += pixels[i] + pixels[i + 1] + pixels[i + 2];
      results[kind].push(brightness);
    }
  }
  pixi.destroy();
  return results;
}
