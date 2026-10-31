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
      return 7;
    },
  ],
  [
    'attack',
    (clock) => {
      return 5 + (Math.floor(clock / 150) % 2);
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
      ? actorFrame(clock % 780, false, true, 0, 600)
      : action === 'fallen'
        ? 7
        : actorFrame(clock, action === 'walk', true);
  actors.forEach((image, i) => {
    const x = 20 + (i % 5) * 235,
      y = 20 + Math.floor(i / 5) * 200;
    const actorRow =
      i < 4
        ? playerFrame(
            action === 'attack' ? clock % 780 : clock,
            action === 'walk',
            action !== 'fallen',
            action === 'attack' ? 0 : -Infinity,
            600,
          )
        : row;
    const breath = idleBreath(clock, actorRow);
    drawArt(ctx, image, direction, actorRow, x + 45, y + 144 * (1 - breath), 144, 144 * breath);
    ctx.fillStyle = '#eedebc';
    ctx.fillText(names[i], x + 117, y + 169);
  });

  for (let i = 0; i < 4; i++) {
    drawArt(
      ctx,
      animalArt,
      i,
      animalFrames.get(action) ?? 1 + (Math.floor(clock / 150) % 3),
      55 + i * 230,
      425,
      120,
      120,
    );
    ctx.fillText(['Boar', 'Cat', 'Chicken', 'Raccoon'][i], 115 + i * 230, 565);
  }

  const bearFrame = bearFrames.get(action)?.(clock) ?? 1 + (Math.floor(clock / 150) % 4);
  drawArt(ctx, bearArt, bearFrame % 4, Math.floor(bearFrame / 4), 980, 440, 110, 110);
  ctx.fillText('Bear cub', 1035, 565);
  const door = [0, 0, 1, 2, 3, 3, 2, 1][Math.floor(clock / 220) % 8];
  drawArt(ctx, wardrobeArt, door, 0, 30, 600, 176, 176, 128);
  drawArt(ctx, effectsArt, Math.floor(clock / 150) % 4, 0, 240, 600, 160, 160, 128);
  drawStonePortal(ctx, 430, 600, 176, 176, clock);
  drawArt(ctx, effectsArt, Math.floor(clock / 120) % 3, 2, 660, 620, 140, 140, 128);
  drawArt(ctx, effectsArt, Math.floor(clock / 120) % 3, 3, 865, 620, 140, 140, 128);
  ['Wardrobe', 'Lantern', 'Portal', 'Fireball', 'Roots'].forEach((name, i) => {
    return ctx.fillText(name, 120 + i * 200, 798);
  });

  for (let i = 0; i < 9; i++) {
    if (i < 3 && buildingArt.complete && buildingArt.naturalWidth) {
      const frame = buildingFrames[i];
      const scale = 126 / frame.width;
      const height = frame.height * scale;
      const x = 10 + i * 132;
      const y = 1000 - height;
      ctx.drawImage(buildingArt, frame.x, frame.y, frame.width, frame.height, x, y, 126, height);
      drawChimneySmoke(ctx, x + frame.chimneyX * scale, y + frame.chimneyY * scale, clock);
    } else if (i === 6) {
      drawTorchFire(ctx, 10 + i * 132 + 63, 1000, clock, true, false, 126, 160);
    } else {
      drawArt(ctx, environmentArt, i % 3, Math.floor(i / 3), 10 + i * 132, 840, 126, 160, 128);
    }
  }

  ctx.canvas.dataset.ready = String(
    artImages.every((image) => {
      return image.complete && image.naturalWidth > 0 && image.dataset.artReady === 'true';
    }),
  );
  ctx.canvas.dataset.frame = String(row);
}
