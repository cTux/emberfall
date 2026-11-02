import type { SceneState } from '@emberfall/common';

export interface Scene extends SceneState {
  nextSpawn: number;
  sequence: number;
  electorate: string;
}
