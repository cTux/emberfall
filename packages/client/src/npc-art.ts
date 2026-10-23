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
