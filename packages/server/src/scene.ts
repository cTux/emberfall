import type { SceneState } from '@emberfall/core/contracts';

export interface Scene extends SceneState {
  nextSpawn: number;
  sequence: number;
  electorate: string;
}
