import type { Player } from '@emberfall/common';
import { companionCaster } from './companion';
import type { Caster } from './lighting';

export function companionShadows(
  players: readonly Player[],
  now: number,
  project: (x: number, y: number) => { x: number; y: number },
): Caster[] {
  const casters: Caster[] = [];

  for (const player of players) {
    if (!player.bear) {
      continue;
    }

    const point = project(player.bear.x, player.bear.y);
    const caster = companionCaster(player.bear, point.x, point.y, now, `bear:${player.id}`);

    if (caster) {
      casters.push(caster);
    }
  }

  return casters;
}
