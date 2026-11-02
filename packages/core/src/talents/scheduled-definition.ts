import type { Scheduled } from './scheduled.ts';
import type { SceneState } from '@emberfall/core/contracts';

export const scheduled = new WeakMap<SceneState, Scheduled[]>();
