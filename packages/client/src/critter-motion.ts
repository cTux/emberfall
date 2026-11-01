import { VILLAGE_CRITTERS, type CritterKind } from '@emberfall/core/definitions/entities/critters';
import { MILLISECONDS_PER_SECOND, wrap, wrappedDelta } from '@emberfall/common';
import { ARENA, FOREST, forestTrees } from '@emberfall/core';

// Existing decorative chicken reactions use hysteresis (70px start/100px stop) so a nearby player does not toggle panic every frame.
const CHICKEN_MOTION = {
  maxStepMs: 100,
  panicExitRadius: 100,
  panicEnterRadius: 70,
  fleeSpeed: 80,
  returnSpeed: 10,
  facingEpsilon: 1e-6,
  panicStepMs: 70,
  walkingStepMs: 180,
  walkFrames: 3,
  movingThreshold: 0.5,
} as const;
// Fixed forest cells and seeded phase strides keep decorative homes stable across wrapped camera views.
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

type Critter = {
  id: string;
  x: number;
  y: number;
  kind: CritterKind;
  left: boolean;
  frame: number;
};
type Bounds = { x: number; y: number; width: number; height: number };
type Point = { x: number; y: number };

export function crittersAt(area: 'village' | 'forest', now: number, bounds: Bounds) {
  return sampleCritters(area, now, bounds);
}

/** One instance per arena mount; decorative reactions never mutate world state. */
export function createCritterMotion() {
  const chickens = new Map<number, Point & { now: number; left: boolean; panicking: boolean }>();

  return (now: number, bounds: Bounds, players: readonly Point[], wanderNow = now) => {
    return sampleCritters('village', wanderNow, bounds, (critter, index) => {
      if (critter.kind !== 'chicken') {
        return critter;
      }

      let state = chickens.get(index);

      if (!state) {
        state = { ...critter, now, panicking: false };
        chickens.set(index, state);
      }

      const dt =
        Math.max(0, Math.min(CHICKEN_MOTION.maxStepMs, now - state.now)) / MILLISECONDS_PER_SECOND;
      state.now = now;
      let distance: number = state.panicking
        ? CHICKEN_MOTION.panicExitRadius
        : CHICKEN_MOTION.panicEnterRadius;
      let away: Point | undefined;

      for (const player of players) {
        const dx = wrappedDelta(state.x, player.x, ARENA.width);
        const dy = wrappedDelta(state.y, player.y, ARENA.height);
        const length = Math.hypot(dx, dy);

        if (length < distance) {
          distance = length;
          away = length > 0 ? { x: dx / length, y: dy / length } : { x: state.left ? -1 : 1, y: 0 };
        }
      }

      state.panicking = !!away;
      const dx = away?.x ?? wrappedDelta(critter.x, state.x, ARENA.width);
      const dy = away?.y ?? wrappedDelta(critter.y, state.y, ARENA.height);
      const length = Math.hypot(dx, dy);
      const step = away
        ? CHICKEN_MOTION.fleeSpeed * dt
        : Math.min(length, CHICKEN_MOTION.returnSpeed * dt);

      if (length > 0) {
        state.x = wrap(state.x + (dx / length) * step, ARENA.width);
        state.y = wrap(state.y + (dy / length) * step, ARENA.height);

        if (Math.abs(dx) > CHICKEN_MOTION.facingEpsilon) {
          state.left = dx < 0;
        }
      }

      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;

      return {
        ...critter,
        x: cx + wrappedDelta(state.x, cx, ARENA.width),
        y: cy + wrappedDelta(state.y, cy, ARENA.height),
        left: length > 0 ? state.left : critter.left,
        frame: away
          ? 1 + (Math.floor(now / CHICKEN_MOTION.panicStepMs) % CHICKEN_MOTION.walkFrames)
          : length > CHICKEN_MOTION.movingThreshold
            ? 1 + (Math.floor(now / CHICKEN_MOTION.walkingStepMs) % CHICKEN_MOTION.walkFrames)
            : critter.frame,
      };
    });
  };
}

function sampleCritters(
  area: 'village' | 'forest',
  now: number,
  bounds: Bounds,
  react?: (critter: Critter, index: number) => Critter,
) {
  const world = area === 'village' ? ARENA : FOREST;
  const cx = bounds.x + bounds.width / 2,
    cy = bounds.y + bounds.height / 2;
  const homes: { x: number; y: number; kind: CritterKind }[] =
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

        homes.push({ x, y, kind: 'raccoon' });
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
