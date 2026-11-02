import type { ResourceState } from '@emberfall/core/contracts';

export function restoreResources(states: Record<string, ResourceState> | undefined, now: number) {
  for (const [id, state] of Object.entries(states ?? {})) {
    if (state.restoresAt <= now) {
      delete states![id];
    }
  }
}
