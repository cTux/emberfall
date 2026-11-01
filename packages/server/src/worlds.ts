import { HEARTBEAT_INTERVAL_MS } from './runtime/limits.ts';
import {
  NORMAL_CLOSE,
  ABNORMAL_CLOSE,
  POLICY_VIOLATION,
  CONSENTED_LEAVE,
  CONNECTION_LOST,
  INCOMPATIBLE_PROTOCOL,
} from './network/codes.ts';
import type { ServerMessage } from '@emberfall/common';
import { Encoder } from '@colyseus/schema';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { once } from 'node:events';
import { createServer as createSecureServer, type ServerOptions } from 'node:https';
import { Server, Room, ServerError, type Client } from '@colyseus/core';
import { WebSocketTransport, type WebSocketClient } from '@colyseus/ws-transport';
import {
  SessionState,
  prepareState,
  applyState,
  type PreparedState,
} from '@emberfall/common/protocol';
import { createRuntime } from './runtime.ts';
import { Peer } from './network/peer.ts';
import { staticHandler } from './http/static.ts';
import { Accounts, type SteamOptions } from './accounts.ts';

// Preserve transport budgets: 128 KiB snapshots, 1 MiB command limit, patches at the existing 20 Hz.
const TRANSPORT = { encoderBytes: 128 * 1024, maxPayloadBytes: 1024 * 1024, patchMs: 50 } as const;
// HTTP authentication failures use the standard Unauthorized response code.
const UNAUTHORIZED = 401;

/** Private session rooms preserve world browsing and transfers on one SDK connection. */
export async function createGameServer(
  staticRoot?: string,
  savePath = ':memory:',
  tls?: ServerOptions,
  steam?: SteamOptions,
  dialogue?: import('./npc-models.ts').NpcDialogue,
) {
  Encoder.BUFFER_SIZE = TRANSPORT.encoderBytes;
  const runtime = await createRuntime(savePath, dialogue);
  // The executable always supplies Steam configuration. Omission is for the
  // isolated legacy/parity fixtures, which exercise the pre-account protocol.
  const accounts = steam
    ? new Accounts(runtime.characters, steam, runtime.renameCharacter)
    : undefined;
  const projections = new WeakMap<object, PreparedState>();

  function replicate(
    state: SessionState,
    message: Extract<ServerMessage, { type: 'state' | 'joined' }>,
  ) {
    let projection = projections.get(message);

    if (!projection) {
      projection = prepareState(message.world);
      projections.set(message, projection);
    }

    applyState(state, projection);
  }

  class SessionRoom extends Room<{ state: SessionState }> {
    override state = new SessionState();
    override maxClients = 1;
    private peer?: Peer;

    override onAuth(_client: Client, options: { ticket?: string }, context: { headers: Headers }) {
      if (!accounts) {
        return true;
      }

      if (context.headers.get('origin') !== accounts.clientOrigin) {
        throw new ServerError(UNAUTHORIZED, 'Invalid origin');
      }

      const token = accounts.consumeTicket(options.ticket);

      if (!token) {
        throw new ServerError(UNAUTHORIZED, 'Please sign in again');
      }

      return token;
    }

    override async onCreate(options: { protocolVersion?: number }) {
      if (options.protocolVersion !== RUNTIME.protocolVersion) {
        throw new ServerError(
          INCOMPATIBLE_PROTOCOL,
          'Client protocol version is incompatible. Reload the game.',
        );
      }

      await this.setPrivate(true);
      this.setPatchRate(TRANSPORT.patchMs);
      this.onMessage('command', (_client, command) => {
        return this.peer?.receive(command);
      });
    }

    override onJoin(client: Client) {
      if (accounts && (typeof client.auth !== 'string' || !accounts.valid(client.auth))) {
        throw new ServerError(UNAUTHORIZED, 'Please sign in again');
      }

      this.peer = new Peer(
        (message) => {
          if (message.type === 'state') {
            replicate(this.state, message);
          } else {
            if (message.type === 'joined') {
              replicate(this.state, message);
            }

            if (message.type === 'left') {
              this.state.header = '';
              this.state.entities.clear();
            }

            client.send('event', message);
          }
        },
        (code) => {
          return client.leave(code === ABNORMAL_CLOSE ? CONNECTION_LOST : code);
        },
        () => {
          return (client as WebSocketClient).ref.bufferedAmount;
        },
      );
      runtime.connect(
        this.peer,
        accounts ? accounts.attach(this.peer, client.auth as string) : undefined,
      );
    }

    override onLeave(_client: Client, code: number) {
      this.peer?.detached(
        code === CONSENTED_LEAVE
          ? NORMAL_CLOSE
          : code === POLICY_VIOLATION
            ? POLICY_VIOLATION
            : ABNORMAL_CLOSE,
      );
    }
  }
  const handler = staticHandler(staticRoot);
  const server = tls ? createSecureServer(tls) : createServer();
  const transport = new WebSocketTransport({
    server,
    maxPayload: TRANSPORT.maxPayloadBytes,
    pingInterval: HEARTBEAT_INTERVAL_MS,
    pingMaxRetries: 1,
    beforeUpgrade: (request) => {
      const origin = request.headers.get('origin');
      try {
        if (accounts && origin !== accounts.clientOrigin) {
          return new Response('Forbidden', { status: 403 });
        }

        if (!accounts && origin && new URL(origin).host !== request.headers.get('host')) {
          return new Response('Forbidden', { status: 403 });
        }
      } catch {
        return new Response('Forbidden', { status: 403 });
      }

      return undefined;
    },
  });
  const game = new Server({
    transport,
    greet: false,
    gracefullyShutdown: false,
    express: (app) => {
      app.use((req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
        if (accounts) {
          void accounts
            .handle(req, res)
            .then((handled) => {
              if (!handled) {
                next();
              }
            })
            .catch(next);
        } else if (req.url === '/api/account') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({ mode: 'legacy', authenticated: false, nickname: null, steamName: '' }),
          );
        } else {
          next();
        }
      });
      app.get('/', handler);
      app.use(handler);
    },
  });
  game.define('session', SessionRoom);

  return {
    server,
    runtime,
    async listen(port: number, host = '127.0.0.1') {
      if (port !== 0) {
        return game.listen(port, host);
      }

      // The ws transport treats zero as its default port. Bind through the public
      // externally-hosted-server API so tests get a real OS-assigned free port.
      await game.serverless();
      const listening = once(server, 'listening');
      server.listen(0, host);
      await listening;
    },
    async close() {
      accounts?.close();
      try {
        await runtime.close();
      } finally {
        await game.gracefullyShutdown(false);
      }
    },
  };
}
