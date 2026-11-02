import { loginCookie } from './login-cookie.ts';
import { setCookie } from './account-cookies.ts';
import { ACCOUNT_LIMITS } from './account-limits.ts';
import { MILLISECONDS_PER_SECOND } from '@emberfall/core/contracts';

export function loginCookieHeader(browser: string) {
  return setCookie(loginCookie, browser, ACCOUNT_LIMITS.loginLifetimeMs / MILLISECONDS_PER_SECOND);
}
