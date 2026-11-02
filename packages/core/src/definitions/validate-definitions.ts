import { game } from '../game.ts';

export function validateDefinitions() {
  return game.status === 'ready';
}
