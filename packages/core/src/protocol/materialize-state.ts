import type { SessionState } from './session-state.ts';
import { collections } from './collections.ts';
import { HOT_SCALARS } from './hot-scalars.ts';
import type { WorldState } from '../contracts/index.ts';

export function materializeState(state: SessionState): WorldState | undefined {
  if (!state.header) {
    return undefined;
  }

  const world = JSON.parse(state.header) as WorldState;
  world.serverNow = state.serverNow;
  world.players = [];

  for (const scene of [world.scene, world.training]) {
    if (scene) {
      for (const key of collections) {
        Object.assign(scene, { [key]: [] });
      }
    }
  }

  for (const [key, record] of [...state.entities].sort((a, b) => {
    return a[1].order - b[1].order;
  })) {
    const value = JSON.parse(record.payload);
    HOT_SCALARS.forEach((field, bit) => {
      if (record.fields & (1 << bit)) {
        value[field] = record[field];
      }
    });

    if (key.startsWith('player:')) {
      world.players.push(value);
    } else if (key.startsWith('npc:')) {
      (world.npcs ??= []).push(value);
    } else {
      const [prefix, collection] = key.split(':');
      const scene = prefix === 'scene' ? world.scene : world.training;

      if (scene && collections.includes(collection as (typeof collections)[number])) {
        (scene[collection as (typeof collections)[number]] as unknown[]).push(value);
      }
    }
  }

  return world;
}
