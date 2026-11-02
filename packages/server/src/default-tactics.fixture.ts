import { DEFAULT_TACTICS } from '@emberfall/core/contracts';

export const tactics = () => {
  return structuredClone(DEFAULT_TACTICS);
};
