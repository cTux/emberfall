import type { SessionState } from './session-state.ts';
import { applyState } from './apply-state.ts';
import { prepareState } from './prepare-state.ts';
import type { WorldState } from '../index.ts';

export function projectState(target: SessionState, source: WorldState) {
  applyState(target, prepareState(source));
}
