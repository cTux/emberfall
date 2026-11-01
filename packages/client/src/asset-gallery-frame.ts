import { drawTorchFire } from './village';
import {
  actorArt,
  animalArt,
  bearArt,
  wardrobeArt,
  environmentArt,
  buildingArt,
  buildingFrames,
  effectsArt,
  drawArt,
  artImages,
} from './art';
import { actorFrame, playerFrame, idleBreath } from './animation';
import { drawStonePortal, drawChimneySmoke } from './ambient-art';

import {
  GALLERY_TIMING,
  GALLERY_FRAMES,
  GALLERY_GRID,
  WARDROBE_PREVIEW_FRAMES,
} from './gallery-calibration.ts';

const names = [
  'warrior',
  'ranger',
  'mage',
  'druid',
  'skeleton',
  'runner',
  'brute',
  'caster',
  'warden',
];
const actors = names.map(actorArt);
const animalFrames = new Map([
  ['fallen', 5],
  ['attack', 4],
  ['idle', 0],
]);
const bearFrames = new Map<string, (clock: number) => number>([
  [
    'fallen',
    () => {
      return GALLERY_FRAMES.bearFallen;
    },
  ],
  [
    'attack',
    (clock) => {
      return GALLERY_FRAMES.bearWindup + (Math.floor(clock / GALLERY_TIMING.animalStepMs) % 2);
    },
  ],
  [
    'idle',
    () => {
      return 0;
    },
  ],
]);

export function drawAssetGalleryFrame(
  ctx: CanvasRenderingContext2D,
  clock: number,
  action: string,
  direction: number,
  background: string,
) {
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, 1200, 1040);
  ctx.imageSmoothingEnabled = false;
  ctx.font = '18px "Alegreya Sans", sans-serif';
  ctx.textAlign = 'center';
  const row =
    action === 'attack'
      ? actorFrame(
          clock % GALLERY_TIMING.attackCycleMs,
          false,
          true,
          0,
          GALLERY_TIMING.attackDurationMs,
        )
      : action === 'fallen'
        ? GALLERY_FRAMES.bearFallen
        : actorFrame(clock, action === 'walk', true);
  actors.forEach((image, i) => {
    const x = GALLERY_GRID.actorLeft + (i % GALLERY_GRID.actorColumns) * GALLERY_GRID.actorStrideX,
      y =
        GALLERY_GRID.actorTop +
        Math.floor(i / GALLERY_GRID.actorColumns) * GALLERY_GRID.actorStrideY;
    const actorRow =
      i < GALLERY_FRAMES.playableClasses
        ? playerFrame(
            action === 'attack' ? clock % GALLERY_TIMING.attackCycleMs : clock,
            action === 'walk',
            action !== 'fallen',
            action === 'attack' ? 0 : -Infinity,
            GALLERY_TIMING.attackDurationMs,
          )
        : row;
    const breath = idleBreath(clock, actorRow);
    drawArt(ctx, image, direction, actorRow, x + 45, y + 144 * (1 - breath), 144, 144 * breath);
    ctx.fillStyle = '#eedebc';
    ctx.fillText(names[i], x + 117, y + 169);
  });

  for (let i = 0; i < GALLERY_FRAMES.animals; i++) {
    drawArt(
      ctx,
      animalArt,
      i,
      animalFrames.get(action) ??
        1 + (Math.floor(clock / GALLERY_TIMING.animalStepMs) % GALLERY_FRAMES.animalWalk),
      55 + i * GALLERY_GRID.animalStride,
      425,
      120,
      120,
    );
    ctx.fillText(
      ['Boar', 'Cat', 'Chicken', 'Raccoon'][i],
      115 + i * GALLERY_GRID.animalStride,
      565,
    );
  }

  const bearFrame =
    bearFrames.get(action)?.(clock) ??
    1 + (Math.floor(clock / GALLERY_TIMING.animalStepMs) % GALLERY_FRAMES.bearWalk);
  drawArt(
    ctx,
    bearArt,
    bearFrame % GALLERY_FRAMES.bearColumns,
    Math.floor(bearFrame / GALLERY_FRAMES.bearColumns),
    980,
    440,
    110,
    110,
  );
  ctx.fillText('Bear cub', 1035, 565);
  const door =
    WARDROBE_PREVIEW_FRAMES[
      Math.floor(clock / GALLERY_TIMING.wardrobeStepMs) % WARDROBE_PREVIEW_FRAMES.length
    ];
  drawArt(ctx, wardrobeArt, door, 0, 30, 600, 176, 176, 128);
  drawArt(
    ctx,
    effectsArt,
    Math.floor(clock / GALLERY_TIMING.animalStepMs) % GALLERY_FRAMES.effects,
    0,
    240,
    600,
    160,
    160,
    128,
  );
  drawStonePortal(ctx, 430, 600, 176, 176, clock);
  drawArt(
    ctx,
    effectsArt,
    Math.floor(clock / GALLERY_TIMING.effectStepMs) % GALLERY_FRAMES.projectileEffects,
    2,
    660,
    620,
    140,
    140,
    128,
  );
  drawArt(
    ctx,
    effectsArt,
    Math.floor(clock / GALLERY_TIMING.effectStepMs) % GALLERY_FRAMES.projectileEffects,
    3,
    865,
    620,
    140,
    140,
    128,
  );
  ['Wardrobe', 'Lantern', 'Portal', 'Fireball', 'Roots'].forEach((name, i) => {
    return ctx.fillText(name, 120 + i * 200, 798);
  });

  for (let i = 0; i < GALLERY_FRAMES.scenery; i++) {
    if (i < buildingFrames.length && buildingArt.complete && buildingArt.naturalWidth) {
      const frame = buildingFrames[i];
      const scale = GALLERY_GRID.sceneryWidth / frame.width;
      const height = frame.height * scale;
      const x = GALLERY_GRID.sceneryLeft + i * GALLERY_GRID.sceneryStride;
      const y = GALLERY_GRID.sceneryBottom - height;
      ctx.drawImage(buildingArt, frame.x, frame.y, frame.width, frame.height, x, y, 126, height);
      drawChimneySmoke(ctx, x + frame.chimneyX * scale, y + frame.chimneyY * scale, clock);
    } else if (i === GALLERY_FRAMES.torch) {
      drawTorchFire(
        ctx,
        GALLERY_GRID.sceneryLeft + i * GALLERY_GRID.sceneryStride + GALLERY_GRID.torchCenterOffset,
        GALLERY_GRID.sceneryBottom,
        clock,
        true,
        false,
        GALLERY_GRID.sceneryWidth,
        GALLERY_GRID.sceneryHeight,
      );
    } else {
      drawArt(
        ctx,
        environmentArt,
        i % GALLERY_FRAMES.sceneryColumns,
        Math.floor(i / GALLERY_FRAMES.sceneryColumns),
        GALLERY_GRID.sceneryLeft + i * GALLERY_GRID.sceneryStride,
        840,
        126,
        160,
        128,
      );
    }
  }

  ctx.canvas.dataset.ready = String(
    artImages.every((image) => {
      return image.complete && image.naturalWidth > 0 && image.dataset.artReady === 'true';
    }),
  );
  ctx.canvas.dataset.frame = String(row);
}
