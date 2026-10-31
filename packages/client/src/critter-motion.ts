import { VILLAGE_CRITTERS, type CritterKind } from '@emberfall/core/definitions/entities/critters';
import { wrap, wrappedDelta } from '@emberfall/common';
import { ARENA, FOREST, forestTrees } from '@emberfall/core';
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

      const dt = Math.max(0, Math.min(100, now - state.now)) / 1000;
      state.now = now;
      let distance = state.panicking ? 100 : 70;
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
      const step = away ? 80 * dt : Math.min(length, 10 * dt);
      if (length > 0) {
        state.x = wrap(state.x + (dx / length) * step, ARENA.width);
        state.y = wrap(state.y + (dy / length) * step, ARENA.height);
        if (Math.abs(dx) > 1e-6) {
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
          ? 1 + (Math.floor(now / 70) % 3)
          : length > 0.5
            ? 1 + (Math.floor(now / 180) % 3)
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
      let row = Math.floor((bounds.y - 40) / 320);
      row <= (bounds.y + bounds.height + 40) / 320;
      row++
    ) {
      for (
        let col = Math.floor((bounds.x - 40) / 320);
        col <= (bounds.x + bounds.width + 40) / 320;
        col++
      ) {
        const c = wrap(col, FOREST.width / 320),
          r = wrap(row, FOREST.height / 320);
        if ((c + r * 3) % 2) {
          continue;
        }

        const x = col * 320 + 120,
          y = row * 320 + 180;
        if (
          forestTrees(x, y, 60).some((t) => {
            return Math.hypot(t.x - x, t.y - y) < 55;
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
        ((now + wrap(home.x, world.width) * 37 + wrap(home.y, world.height) * 19) % 12000) / 1000;
      const moving = phase < 4 || (phase >= 6 && phase < 10);
      const offset = phase < 4 ? phase * 10 : phase < 6 ? 40 : phase < 10 ? (10 - phase) * 10 : 0;
      const critter = {
        ...home,
        id: `${home.kind}:${wrap(home.x, ARENA.width)}:${wrap(home.y, ARENA.height)}`,
        x: home.x + offset - 20,
        left: phase >= 6,
        frame: moving ? 1 + (Math.floor(now / 180) % 3) : phase > 4.5 && phase < 5.5 ? 4 : 0,
      };

      return react ? react(critter, index) : critter;
    })
    .filter((p) => {
      return (
        p.x >= bounds.x - 24 &&
        p.x <= bounds.x + bounds.width + 24 &&
        p.y >= bounds.y - 24 &&
        p.y <= bounds.y + bounds.height + 24
      );
    });
}
