import { DEFAULT_TACTICS } from '@emberfall/common';

export const tactics = () => {
  return structuredClone(DEFAULT_TACTICS);
};
