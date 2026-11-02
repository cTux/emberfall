import type { Bounds } from './bounds.ts';

import { CHICKEN_MOTION } from './chicken-motion.ts';
import { ARENA, FOREST, forestTrees } from '@emberfall/core';

// Existing decorative chicken reactions use hysteresis (70px start/100px stop) so a nearby player does not toggle panic every frame.
import { type CritterKind, VILLAGE_CRITTERS } from '@emberfall/core/definitions/entities/critters';
import { MILLISECONDS_PER_SECOND } from '@emberfall/core/contracts';
import { wrappedDelta, wrap } from '@emberfall/core/geometry';
// Fixed forest cells and seeded phase strides keep decorative homes stable across wrapped camera views.
// Existing 12-second wander choreography travels 40px out/back with pauses and one idle action near the turn.
const CRITTER_WANDER = {
  outboundSeconds: 4,
  returnStartsSeconds: 6,
  returnEndsSeconds: 10,
  speed: 10,
  excursion: 40,
  centerOffset: 20,
  actionStartsSeconds: 4.5,
  actionEndsSeconds: 5.5,
  actionRow: 4,
} as const;
const CRITTER_HOMES = {
  margin: 40,
  cellSize: 320,
  rowStride: 3,
  offsetX: 120,
  offsetY: 180,
  treeQueryRadius: 60,
  treeClearance: 55,
  xPhaseStride: 37,
  yPhaseStride: 19,
  cycleMs: 12000,
  viewportMargin: 24,
} as const;
type Critter = {
  id: string;
  x: number;
  y: number;
  kind: CritterKind;
  left: boolean;
  frame: number;
};

export function sampleCritters(
  area: 'village' | 'forest',
  now: number,
  bounds: Bounds,
  react?: (critter: Critter, index: number) => Critter,
) {
  const world = area === 'village' ? ARENA : FOREST;
  const cx = bounds.x + bounds.width / 2,
    cy = bounds.y + bounds.height / 2;
  const homes: {
    x: number;
    y: number;
    kind: CritterKind;
  }[] =
    area === 'village'
      ? VILLAGE_CRITTERS.map((home) => {
          return {
            ...home,
            x: cx + wrappedDelta(home.x, cx, ARENA.width),
            y: cy + wrappedDelta(home.y, cy, ARENA.height),
          };
        })
      : [];

  if (area === 'forest') {
    for (
      let row = Math.floor((bounds.y - CRITTER_HOMES.margin) / CRITTER_HOMES.cellSize);
      row <= (bounds.y + bounds.height + CRITTER_HOMES.margin) / CRITTER_HOMES.cellSize;
      row++
    ) {
      for (
        let col = Math.floor((bounds.x - CRITTER_HOMES.margin) / CRITTER_HOMES.cellSize);
        col <= (bounds.x + bounds.width + CRITTER_HOMES.margin) / CRITTER_HOMES.cellSize;
        col++
      ) {
        const c = wrap(col, FOREST.width / CRITTER_HOMES.cellSize),
          r = wrap(row, FOREST.height / CRITTER_HOMES.cellSize);

        if ((c + r * CRITTER_HOMES.rowStride) % 2) {
          continue;
        }

        const x = col * CRITTER_HOMES.cellSize + CRITTER_HOMES.offsetX,
          y = row * CRITTER_HOMES.cellSize + CRITTER_HOMES.offsetY;

        if (
          forestTrees(x, y, CRITTER_HOMES.treeQueryRadius).some((t) => {
            return Math.hypot(t.x - x, t.y - y) < CRITTER_HOMES.treeClearance;
          })
        ) {
          continue;
        }

        homes.push({
          x,
          y,
          kind: 'raccoon',
        });
      }
    }
  }

  return homes
    .map((home, index) => {
      const phase =
        ((now +
          wrap(home.x, world.width) * CRITTER_HOMES.xPhaseStride +
          wrap(home.y, world.height) * CRITTER_HOMES.yPhaseStride) %
          CRITTER_HOMES.cycleMs) /
        MILLISECONDS_PER_SECOND;
      const moving =
        phase < CRITTER_WANDER.outboundSeconds ||
        (phase >= CRITTER_WANDER.returnStartsSeconds && phase < CRITTER_WANDER.returnEndsSeconds);
      const offset =
        phase < CRITTER_WANDER.outboundSeconds
          ? phase * CRITTER_WANDER.speed
          : phase < CRITTER_WANDER.returnStartsSeconds
            ? CRITTER_WANDER.excursion
            : phase < CRITTER_WANDER.returnEndsSeconds
              ? (CRITTER_WANDER.returnEndsSeconds - phase) * CRITTER_WANDER.speed
              : 0;
      const critter = {
        ...home,
        id: `${home.kind}:${wrap(home.x, ARENA.width)}:${wrap(home.y, ARENA.height)}`,
        x: home.x + offset - CRITTER_WANDER.centerOffset,
        left: phase >= CRITTER_WANDER.returnStartsSeconds,
        frame: moving
          ? 1 + (Math.floor(now / CHICKEN_MOTION.walkingStepMs) % CHICKEN_MOTION.walkFrames)
          : phase > CRITTER_WANDER.actionStartsSeconds && phase < CRITTER_WANDER.actionEndsSeconds
            ? CRITTER_WANDER.actionRow
            : 0,
      };

      return react ? react(critter, index) : critter;
    })
    .filter((p) => {
      return (
        p.x >= bounds.x - CRITTER_HOMES.viewportMargin &&
        p.x <= bounds.x + bounds.width + CRITTER_HOMES.viewportMargin &&
        p.y >= bounds.y - CRITTER_HOMES.viewportMargin &&
        p.y <= bounds.y + bounds.height + CRITTER_HOMES.viewportMargin
      );
    });
}
