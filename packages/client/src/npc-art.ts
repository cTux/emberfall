import type { VillageNpc } from '@emberfall/common';
import { innkeeperArt, loadArt } from './art';
import { characterImages } from './characters';
import { makeMask } from './lighting';
import { movementFacing } from './facing';
import { playerFrame } from './animation';
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
    const row = marta
      ? npc.moving
        ? Math.floor(now / 160) % 4
        : 0
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
        height: 48,
        name: npc.name,
        npc,
        ...frame,
      },
    ];
  });
}

export function drawSilence(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#641e2b';
  ctx.strokeStyle = '#ff8794';
  ctx.lineWidth = 1.5;
  ctx.fillRect(x - 9, y - 9, 18, 18);
  ctx.strokeRect(x - 9, y - 9, 18, 18);
  ctx.beginPath();
  ctx.moveTo(x - 5, y - 4);
  ctx.lineTo(x + 5, y - 4);
  ctx.lineTo(x + 5, y + 2);
  ctx.lineTo(x - 1, y + 2);
  ctx.lineTo(x - 4, y + 5);
  ctx.lineTo(x - 4, y + 2);
  ctx.lineTo(x - 5, y + 2);
  ctx.closePath();
  ctx.stroke();
  ctx.strokeStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(x - 6, y + 6);
  ctx.lineTo(x + 6, y - 6);
  ctx.stroke();
  ctx.restore();
}
