import type { VillageNpc } from '@emberfall/common';
import { innkeeperArt, loadArt } from './art';
import { characterImages } from './characters';
import { makeMask } from './lighting';
import { movementFacing } from './facing';
import { playerFrame } from './animation';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { Scenery } from './village';

const walkingMarta = loadArt('innkeeper-walk', 4, 4, 64, true);
const frames = new WeakMap<
  HTMLImageElement,
  Map<string, { sprite: HTMLCanvasElement; mask: HTMLCanvasElement }>
>();

/** Cache only the finite atlas cells; positions always come from server snapshots. */
export function npcScenery(npcs: VillageNpc[], now: number): Scenery[] {
  return npcs.flatMap((npc) => {
    const facing = movementFacing(Math.cos(npc.angle), Math.sin(npc.angle), 0);
    const marta = npc.id === 'innkeeper';
    const image = marta
      ? npc.moving
        ? walkingMarta
        : innkeeperArt
      : characterImages[
          npc.id === 'hallkeeper' ? 'druid' : npc.id === 'craftsman' ? 'warrior' : 'ranger'
        ].walk;
    if (!image.complete || !image.naturalWidth) return [];
    const column = marta && !npc.moving ? Math.floor(now / 400) % 4 : facing;
    const station = VILLAGE_DEFINITION.workstations.find((s) => s.id === npc.workstationId);
    const working = !!station;
    const actionPose = station?.activity === 'forging' || station?.activity === 'archery';
    const phase = Math.max(0, now - (npc.workStartedAt ?? now));
    const row = marta
      ? npc.moving
        ? Math.floor(now / 160) % 4
        : 0
      : actionPose
        ? phase % 1600 < 650
          ? 5
          : 6
        : playerFrame(now, npc.moving, true);
    let atlas = frames.get(image);
    if (!atlas) frames.set(image, (atlas = new Map()));
    const key = `${column}:${row}`;
    let frame = atlas.get(key);
    if (!frame) {
      const sprite = document.createElement('canvas');
      sprite.width = sprite.height = 64;
      sprite.getContext('2d')!.drawImage(image, column * 64, row * 64, 64, 64, 0, 0, 64, 64);
      frame = { sprite, mask: makeMask(sprite) };
      atlas.set(key, frame);
    }
    return [
      {
        id: `npc:${npc.id}`,
        x: npc.x,
        y: npc.y,
        width: 48,
        height: working ? 48 + Math.sin(phase / 180) * 1.2 : 48,
        name: npc.name,
        npc,
        ...frame,
      },
    ];
  });
}

/** Presentation effects only: tools and practice arrows never enter combat simulation. */
export function drawNpcWork(
  ctx: CanvasRenderingContext2D,
  npc: VillageNpc,
  x: number,
  y: number,
  now: number,
) {
  const station = VILLAGE_DEFINITION.workstations.find((s) => s.id === npc.workstationId);
  if (!station) return;
  const phase = Math.max(0, now - (npc.workStartedAt ?? now));
  const cycle = (phase % 1600) / 1600;
  const dx = station.x - station.worker.x;
  const dy = station.y - station.worker.y;
  ctx.save();
  ctx.translate(x, y);
  ctx.lineCap = 'round';
  ctx.lineWidth = 2;
  if (station.activity === 'archery') {
    if (cycle > 0.4 && cycle < 0.85) {
      const flight = (cycle - 0.4) / 0.45;
      const ax = -10 + (dx + 10) * flight;
      const ay = -26 + (dy + 8) * flight;
      ctx.strokeStyle = '#e5cf9c';
      ctx.beginPath();
      ctx.moveTo(ax + 9, ay + 2);
      ctx.lineTo(ax, ay);
      ctx.stroke();
    }
  } else {
    // Stirring circles, hammer strokes, quill strokes, and scraping motions.
    const stirring = ['cooking', 'brewing', 'alchemy'].includes(station.activity);
    const handX = -11 + (stirring ? Math.sin(phase / 180) * 4 : cycle < 0.45 ? 2 : -5);
    const handY = -25 + (stirring ? Math.cos(phase / 180) * 2 : cycle < 0.45 ? -10 : 0);
    ctx.strokeStyle = station.activity === 'writing' ? '#eee0bc' : '#a77b4e';
    ctx.beginPath();
    ctx.moveTo(-8, -23);
    ctx.lineTo(handX - 8, handY);
    ctx.stroke();
    if (station.activity === 'forging') {
      ctx.fillStyle = '#aeb6b9';
      ctx.fillRect(handX - 12, handY - 3, 8, 5);
    }
    if (['forging', 'smelting'].includes(station.activity) && cycle > 0.45 && cycle < 0.7) {
      ctx.fillStyle = '#ffc071';
      for (let i = 0; i < 4; i++) {
        const spark = (cycle - 0.45) * 4;
        ctx.fillRect(dx + Math.sin(i * 2) * spark * 16, dy - 18 - spark * (12 + i * 3), 2, 2);
      }
    }
    if (stirring || station.activity === 'smelting') {
      ctx.strokeStyle = station.activity === 'alchemy' ? '#b8d9b088' : '#e8dfc688';
      for (let i = 0; i < 3; i++) {
        const rise = (phase / 1700 + i / 3) % 1;
        ctx.globalAlpha *= 1 - rise;
        ctx.beginPath();
        ctx.moveTo(dx + Math.sin(phase / 500 + i) * 4, dy - 25 - rise * 18);
        ctx.lineTo(dx + Math.sin(phase / 500 + i + 1) * 4, dy - 31 - rise * 18);
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
