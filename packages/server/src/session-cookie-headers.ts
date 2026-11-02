import { sessionCookie } from './session-cookie.ts';
import { loginCookie } from './login-cookie.ts';
import { setCookie } from './account-cookies.ts';
import { ACCOUNT_LIMITS } from './account-limits.ts';
import { MILLISECONDS_PER_SECOND } from '@emberfall/core/contracts';

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
