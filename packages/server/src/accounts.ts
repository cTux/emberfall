import { POLICY_VIOLATION } from './network/codes.ts';
import { accountResponse, accountView } from './account-response.ts';
import { readAccountBody } from './account-body.ts';
import { cookie } from './account-cookies.ts';
import { accountOrigins, type SteamOptions } from './account-options.ts';
export { steamOptionsFromEnv, type SteamOptions } from './account-options.ts';
import { constants as HTTP } from 'node:http2';
import { ACCOUNT_LIMITS as AUTH } from './account-limits.ts';
import * as credentials from './account-credentials.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { nicknameSchema, type AccountView } from '@emberfall/common';

import type { CharacterStore } from './characters.ts';
import { Peer } from './network/peer.ts';
import { SteamProvider } from './steam.ts';

export class Accounts {
  readonly origin: string;
  readonly clientOrigin: string;
  private clientUrl?: string;
  private steam: SteamProvider;
  private attempts = new Map<string, { cookieHash: string; expires: number }>();
  private tickets = new Map<string, { token: string; expires: number }>();
  private limits = new Map<string, { count: number; expires: number }>();
  private peers = new Map<Peer, string>();
  private pending = 0;
  private timer: ReturnType<typeof setInterval>;
  private store: CharacterStore;
  private renamed: (id: string, name: string) => void;

  constructor(
    store: CharacterStore,
    options: SteamOptions,
    renamed: (id: string, name: string) => void,
  ) {
    this.store = store;
    this.renamed = renamed;
    const origins = accountOrigins(options);
    this.origin = origins.origin;
    this.clientOrigin = origins.clientOrigin;
    this.clientUrl = origins.clientUrl;
    this.steam = new SteamProvider(options.apiKey, options.request);
    this.timer = setInterval(() => {
      return this.sweep();
    }, AUTH.sweepIntervalMs);
    this.timer.unref();
  }

  private sweep() {
    const now = Date.now();

    for (const map of [this.attempts, this.tickets, this.limits]) {
      for (const [key, value] of map) {
        if (value.expires <= now) {
          map.delete(key);
        }
      }
    }

    for (const [peer, token] of this.peers) {
      if (!this.store.session(token)) {
        peer.close(POLICY_VIOLATION, 'Session expired');
      }

      if (peer.readyState === Peer.CLOSED) {
        this.peers.delete(peer);
      }
    }
  }

  private limit(key: string, max: number) {
    this.sweep();
    const value = this.limits.get(key) ?? {
      count: 0,
      expires: Date.now() + AUTH.rateWindowMs,
    };

    if (this.limits.size >= AUTH.maxRecords && !this.limits.has(key)) {
      throw new Error('Too many requests. Try again shortly.');
    }

    this.limits.set(key, value);

    if (++value.count > max) {
      throw new Error('Too many requests. Try again shortly.');
    }
  }

  consumeTicket(ticket: unknown) {
    if (typeof ticket !== 'string') {
      return undefined;
    }

    const key = credentials.credentialHash(ticket),
      saved = this.tickets.get(key);
    this.tickets.delete(key);

    if (!saved || saved.expires <= Date.now() || !this.store.session(saved.token)?.nickname) {
      return undefined;
    }

    return saved.token;
  }

  attach(peer: Peer, token: string) {
    this.peers.set(peer, token);

    return () => {
      return this.store.session(token);
    };
  }

  valid(token: string) {
    return !!this.store.session(token)?.nickname;
  }

  close() {
    clearInterval(this.timer);
  }

  async handle(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
    const url = new URL(req.url ?? '/', this.origin);

    if (!url.pathname.startsWith('/auth/') && !url.pathname.startsWith('/api/account')) {
      return false;
    }

    const response = accountResponse(req, res, this.clientOrigin);

    if (!response) {
      return true;
    }

    const { json, redirect } = response;
    const token = cookie(req.headers.cookie, credentials.sessionCookie);
    try {
      if (req.method === 'GET' && url.pathname === '/auth/steam') {
        this.limit(`login:${req.socket.remoteAddress}`, AUTH.loginsPerWindow);

        if (this.attempts.size >= AUTH.maxRecords) {
          throw new Error('Login is busy. Try again shortly.');
        }

        const state = credentials.randomCredential(),
          browser = credentials.randomCredential();
        this.attempts.set(state, {
          cookieHash: credentials.credentialHash(browser),
          expires: Date.now() + AUTH.loginLifetimeMs,
        });
        res.setHeader('Set-Cookie', credentials.loginCookieHeader(browser));
        redirect(this.steam.loginUrl(`${this.origin}/auth/steam/callback?state=${state}`));

        return true;
      }

      if (req.method === 'GET' && url.pathname === '/auth/steam/callback') {
        const state = url.searchParams.get('state') ?? '';
        const attempt = this.attempts.get(state);

        if (
          !attempt ||
          attempt.expires <= Date.now() ||
          attempt.cookieHash !==
            credentials.credentialHash(cookie(req.headers.cookie, credentials.loginCookie)) ||
          this.pending >= AUTH.maxPendingVerifications
        ) {
          throw new Error('Login expired. Please try again.');
        }

        this.attempts.delete(state);
        this.pending++;
        try {
          const steamId = await this.steam.verify(
            url.searchParams,
            `${this.origin}/auth/steam/callback?state=${state}`,
          );
          let steamName = '';
          try {
            steamName = await this.steam.profile(steamId);
          } catch {
            /* Manual nickname entry remains available. */
          }

          this.store.loginSteam(steamId, steamName);
          const session = this.store.createSession(steamId, Date.now() + AUTH.sessionLifetimeMs);
          this.store.revokeSession(token);
          this.sweep();
          res.setHeader(
            'Set-Cookie',
            credentials.sessionCookieHeaders(session, this.clientOrigin !== this.origin),
          );
          redirect(this.clientUrl ?? '/');
        } finally {
          this.pending--;
        }

        return true;
      }

      const account = this.store.session(token);

      if (req.method === 'GET' && url.pathname === '/api/account') {
        json(HTTP.HTTP_STATUS_OK, accountView(account));

        return true;
      }

      if (!account) {
        json(HTTP.HTTP_STATUS_UNAUTHORIZED, { error: 'Please sign in through Steam.' });

        return true;
      }

      if (
        req.headers.origin !== this.clientOrigin ||
        !['POST', 'PATCH'].includes(req.method ?? '')
      ) {
        json(HTTP.HTTP_STATUS_FORBIDDEN, { error: 'Request origin is not allowed.' });

        return true;
      }

      this.limit(`account:${account.steamId}`, AUTH.accountRequestsPerWindow);

      if (req.method === 'POST' && url.pathname === '/api/account/ticket') {
        if (!nicknameSchema.safeParse(account.nickname).success) {
          json(HTTP.HTTP_STATUS_CONFLICT, { error: 'Choose your nickname first.' });

          return true;
        }

        if (this.tickets.size >= AUTH.maxRecords) {
          throw new Error('Server is busy. Try again shortly.');
        }

        const ticket = credentials.randomCredential();
        this.tickets.set(credentials.credentialHash(ticket), {
          token,
          expires: Date.now() + AUTH.ticketLifetimeMs,
        });
        json(HTTP.HTTP_STATUS_OK, { ticket });
      } else if (req.method === 'POST' && url.pathname === '/auth/logout') {
        this.store.revokeSession(token);
        this.sweep();
        res.setHeader(
          'Set-Cookie',
          credentials.logoutCookieHeader(this.clientOrigin !== this.origin),
        );
        json(HTTP.HTTP_STATUS_OK, { ok: true });
      } else if (req.method === 'PATCH' && url.pathname === '/api/account/nickname') {
        if (!req.headers['content-type']?.startsWith('application/json')) {
          throw new Error('Expected JSON.');
        }

        const body = await readAccountBody(req);
        const parsed = nicknameSchema.safeParse(
          body && typeof body === 'object' && 'nickname' in body ? body.nickname : undefined,
        );

        if (!parsed.success) {
          json(HTTP.HTTP_STATUS_BAD_REQUEST, {
            error: 'Use 1–24 characters without invisible or control characters.',
          });

          return true;
        }

        // Recheck after reading the body, which may have yielded to logout/expiry.
        if (!this.store.session(token)) {
          json(HTTP.HTTP_STATUS_UNAUTHORIZED, { error: 'Please sign in again.' });

          return true;
        }

        const updated = this.store.renameSteam(account.steamId, parsed.data);
        this.renamed(updated.characterId, parsed.data);
        json(HTTP.HTTP_STATUS_OK, {
          mode: 'steam',
          authenticated: true,
          nickname: updated.nickname,
          steamName: updated.steamName,
        } satisfies AccountView);
      } else {
        json(HTTP.HTTP_STATUS_NOT_FOUND, { error: 'Not found' });
      }
    } catch {
      if (url.pathname === '/auth/steam/callback') {
        redirect(this.clientUrl ? `${this.clientUrl}?login=failed` : '/?login=failed');
      } else {
        json(HTTP.HTTP_STATUS_BAD_REQUEST, {
          error: 'Unable to complete the request. Please try again.',
        });
      }
    }

    return true;
  }
}
