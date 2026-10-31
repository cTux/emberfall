import { PixiContext } from '../packages/client/src/rendering/pixi-context';
import { drawNpcWork } from '../packages/client/src/npc-work';
import { VILLAGE_DEFINITION } from '../packages/core/src/definitions/worlds/village';
import type { VillageNpc } from '../packages/common/src/index';

export async function preview() {
  const canvas = document.createElement('canvas');
  document.body.append(canvas);
  const pixi = new PixiContext(canvas);
  pixi.resize(1040, 480);
  await pixi.ready;
  const ctx = pixi as unknown as CanvasRenderingContext2D;
  const image = new Image();
  image.src = '/assets/wardrobe-style/workstations.png';
  await image.decode();
  const counts: number[] = [];
  const disabled: number[] = [];

  for (const enabled of [false, true]) {
    pixi.begin();

    for (const station of VILLAGE_DEFINITION.workstations) {
      const column = station.art % 4,
        row = Math.floor(station.art / 4);
      const npc: VillageNpc = {
        id: station.npcId,
        buildingId: station.buildingId,
        name: '',
        ...station.worker,
        angle: 0,
        moving: false,
        silenced: false,
        workstationId: station.id,
        workStartedAt: 0,
      };
      ctx.save();
      ctx.translate(column * 260 + 130, row * 240 + 180);
      ctx.scale(3, 3);
      drawNpcWork(
        ctx,
        npc,
        station.worker.x - station.x,
        station.worker.y - station.y,
        960,
        enabled,
      );
      ctx.restore();
    }

    pixi.present();
    const capture = document.createElement('canvas');
    capture.width = 1040;
    capture.height = 480;
    const pixels = capture.getContext('2d')!;
    pixels.drawImage(canvas, 0, 0);

    for (const station of VILLAGE_DEFINITION.workstations) {
      const data = pixels.getImageData(
        (station.art % 4) * 260,
        Math.floor(station.art / 4) * 240,
        260,
        240,
      ).data;
      let count = 0;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i] || data[i + 1] || data[i + 2]) {
          count++;
        }
      }

      (enabled ? counts : disabled).push(count);
    }
  }

  // Leave a readable gallery with the real workstation art for visual review.
  pixi.begin();
  ctx.fillStyle = '#323b2d';
  ctx.fillRect(0, 0, 1040, 480);

  for (const station of VILLAGE_DEFINITION.workstations) {
    const column = station.art % 4,
      row = Math.floor(station.art / 4);
    ctx.save();
    ctx.translate(column * 260 + 130, row * 240 + 180);
    ctx.fillStyle = '#eee4ce';
    ctx.font = '16px sans-serif';
    ctx.fillText(station.name, -100, 35);
    ctx.scale(3, 3);
    ctx.drawImage(image, column * 128, row * 128, 128, 128, -24, -48, 48, 48);
    drawNpcWork(
      ctx,
      {
        id: station.npcId,
        buildingId: station.buildingId,
        name: '',
        ...station.worker,
        angle: 0,
        moving: false,
        silenced: false,
        workstationId: station.id,
        workStartedAt: 0,
      },
      station.worker.x - station.x,
      station.worker.y - station.y,
      960,
    );
    ctx.restore();
  }

  pixi.present();

  return { counts, disabled };
}
