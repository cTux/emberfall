import { PASSWORD_HASH_BYTES } from './limits.ts';
import { scrypt } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);

export function createWorldPasswords() {
  let pending = 0;

  return {
    get pending() {
      return pending;
    },
    async hash(password: string, salt: string) {
      pending++;
      try {
        return (await derive(password, salt, PASSWORD_HASH_BYTES)) as Buffer;
      } finally {
        pending--;
      }
    },
  };
}
