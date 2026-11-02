import { sessionCookie } from './session-cookie.ts';
import { setCookie } from './account-cookies.ts';

export function logoutCookieHeader(crossOrigin: boolean) {
  return setCookie(sessionCookie, '', 0, crossOrigin);
}
