import type { Preferences } from './preferences';

export type BooleanPreference = {
  [K in keyof Preferences]-?: Preferences[K] extends boolean ? K : never;
}[keyof Preferences];
