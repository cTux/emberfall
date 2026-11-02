import { randomBytes } from 'node:crypto';
import { ACCOUNT_LIMITS } from './account-limits.ts';

export function randomCredential() {
  return randomBytes(ACCOUNT_LIMITS.credentialBytes).toString('hex');
}
