import type { Bounds } from './bounds.ts';
import { sampleCritters } from './sample-critters.ts';
import { CHICKEN_MOTION } from './chicken-motion.ts';
import { MILLISECONDS_PER_SECOND } from '@emberfall/core/contracts';
import { wrappedDelta, wrap } from '@emberfall/core/geometry';
import { ARENA } from '@emberfall/core';

// Existing decorative chicken reactions use hysteresis (70px start/100px stop) so a nearby player does not toggle panic every frame.

type Point = { x: number; y: number };

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
