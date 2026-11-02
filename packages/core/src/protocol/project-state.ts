import type { SessionState } from './session-state.ts';
import { applyState } from './apply-state.ts';
import { prepareState } from './prepare-state.ts';
import type { WorldState } from '../contracts/index.ts';

export function projectState(target: SessionState, source: WorldState) {
  applyState(target, prepareState(source));
}
