import type { VillageNpc } from '@emberfall/common';
import { innkeeperArt, loadArt } from './art';
import { characterImages } from './characters';
import { makeMask } from './lighting';
import { movementFacing } from './facing';
import { playerFrame } from './animation';
import { VILLAGE_DEFINITION } from '@emberfall/core/definitions/worlds/village';
import type { Scenery } from './village';

// Native NPC sheets use four directions/poses and 64-pixel cells; existing work timing matches their action rows.
const NPC_POSES = {
  columns: 4,
  rows: 4,
  cell: 64,
  idleFrameMs: 400,
  walkFrameMs: 160,
  workCycleMs: 1600,
  windupMs: 650,
  windupRow: 5,
  releaseRow: 6,
  drawnSize: 48,
  breathPeriodMs: 180,
  breathAmplitude: 1.2,
};

const walkingMarta = loadArt(
  'innkeeper-walk',
  NPC_POSES.columns,
  NPC_POSES.rows,
  NPC_POSES.cell,
  true,
);
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

    if (!image.complete || !image.naturalWidth) {
      return [];
    }

    const column =
      marta && !npc.moving ? Math.floor(now / NPC_POSES.idleFrameMs) % NPC_POSES.columns : facing;
    const station = VILLAGE_DEFINITION.workstations.find((s) => {
      return s.id === npc.workstationId;
    });
    const working = !!station;
    const actionPose = station?.activity === 'forging' || station?.activity === 'archery';
    const phase = Math.max(0, now - (npc.workStartedAt ?? now));
    const row = marta
      ? npc.moving
        ? Math.floor(now / NPC_POSES.walkFrameMs) % NPC_POSES.rows
        : 0
      : actionPose
        ? phase % NPC_POSES.workCycleMs < NPC_POSES.windupMs
          ? NPC_POSES.windupRow
          : NPC_POSES.releaseRow
        : playerFrame(now, npc.moving, true);
    let atlas = frames.get(image);

    if (!atlas) {
      frames.set(image, (atlas = new Map()));
    }

    const key = `${column}:${row}`;
    let frame = atlas.get(key);

    if (!frame) {
      const sprite = document.createElement('canvas');
      const cell = NPC_POSES.cell * Number(image.dataset.artResolution ?? 1);
      sprite.width = sprite.height = cell;
      sprite
        .getContext('2d')!
        .drawImage(image, column * cell, row * cell, cell, cell, 0, 0, cell, cell);
      frame = { sprite, mask: makeMask(sprite) };
      atlas.set(key, frame);
    }

    return [
      {
        id: `npc:${npc.id}`,
        x: npc.x,
        y: npc.y,
        width: NPC_POSES.drawnSize,
        height: working
          ? NPC_POSES.drawnSize +
            Math.sin(phase / NPC_POSES.breathPeriodMs) * NPC_POSES.breathAmplitude
          : NPC_POSES.drawnSize,
        name: npc.name,
        npc,
        ...frame,
      },
    ];
  });
}
