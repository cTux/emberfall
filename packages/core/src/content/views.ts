import { game } from '../game.ts';
import type { Widen } from './contracts.ts';
export function setting<T>(id: string): Widen<T> {
  return game.registries.settings.require(id).value as Widen<T>;
}
