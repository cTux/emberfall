import { randomBytes, createHash } from 'node:crypto';
import { ACCOUNT_LIMITS } from './account-limits.ts';
import { MILLISECONDS_PER_SECOND } from '@emberfall/common';
import { setCookie } from './account-cookies.ts';

export const sessionCookie = '__Host-emberfall-session';
export const loginCookie = '__Host-emberfall-login';

export function randomCredential() {
  return randomBytes(ACCOUNT_LIMITS.credentialBytes).toString('hex');
}

export function credentialHash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

export function loginCookieHeader(browser: string) {
  return setCookie(loginCookie, browser, ACCOUNT_LIMITS.loginLifetimeMs / MILLISECONDS_PER_SECOND);
}

export function sessionCookieHeaders(session: string, crossOrigin: boolean) {
  return [
    setCookie(
      sessionCookie,
      session,
      ACCOUNT_LIMITS.sessionLifetimeMs / MILLISECONDS_PER_SECOND,
      crossOrigin,
    ),
    setCookie(loginCookie, '', 0),
  ];
}

export function logoutCookieHeader(crossOrigin: boolean) {
  return setCookie(sessionCookie, '', 0, crossOrigin);
}
