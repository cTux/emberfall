import type { Scheduled } from './scheduled.ts';
import type { SceneState } from '@emberfall/common';

export const scheduled = new WeakMap<SceneState, Scheduled[]>();
