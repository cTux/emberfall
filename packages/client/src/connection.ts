import { apiUrl } from './urls.ts';
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { Client, type Room } from '@colyseus/sdk';
import { SessionState, materializeState } from '@emberfall/common/protocol';
import type { ServerMessage, ClientMessage } from '@emberfall/common';

// Standard WebSocket normal closure distinguishes an intentional leave from a transport error.
const NORMAL_CLOSE = 1000;

// Match the account UI request budget so ticket acquisition fails promptly when authentication is unavailable.
const TICKET_REQUEST_TIMEOUT_MS = 10_000;

/** SDK adapter keeps application recovery separate from transport recovery. */
export class GameConnection {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: ServerMessage }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  private room?: Room<SessionState>;
  private closed = false;
  private steam: boolean;

  constructor(url: string, steam = false) {
    this.steam = steam;
    void this.connect(url);
  }

  private async connect(url: string) {
    try {
      const endpoint = new URL(url);
      endpoint.pathname = '/';
      const options =
        typeof location !== 'undefined' && import.meta.env?.DEV && endpoint.host === location.host
          ? {
              urlBuilder: (url: URL) => {
                if (url.protocol.startsWith('ws')) {
                  url.pathname = `/colyseus${url.pathname}`;
                }

                return url.toString();
              },
            }
          : undefined;
      let ticket: string | undefined;

      if (this.steam) {
        const response = await fetch(apiUrl('/api/account/ticket'), {
          method: 'POST',
          credentials: 'include',
          signal: AbortSignal.timeout(TICKET_REQUEST_TIMEOUT_MS),
        });

        if (!response.ok) {
          throw new Error('Authentication required');
        }

        ticket = (await response.json()).ticket;
      }

      const room = await new Client(endpoint.toString(), options).create<SessionState>(
        'session',
        { protocolVersion: RUNTIME.protocolVersion, ticket },
        SessionState,
      );
      this.room = room;
      room.reconnection.enabled = false;

      if (this.closed) {
        await room.leave();

        return;
      }

      room.onMessage('event', (message: ServerMessage) => {
        return this.onmessage?.({ data: message });
      });
      room.onStateChange((state) => {
        const world = materializeState(state);

        if (world) {
          this.onmessage?.({ data: { type: 'state', world } });
        }
      });
      room.onLeave(() => {
        this.readyState = GameConnection.CLOSED;
        this.onclose?.();
      });
      room.onError(() => {
        return this.onerror?.();
      });
      this.readyState = GameConnection.OPEN;
      this.onopen?.();
      room.send('command', { type: 'ping', id: 1 });
    } catch {
      if (!this.closed) {
        this.onerror?.();
        this.readyState = GameConnection.CLOSED;
        this.onclose?.();
      }
    }
  }

  send(data: ClientMessage) {
    if (this.readyState === GameConnection.OPEN) {
      this.room?.send('command', data);
    }
  }

  close(code = NORMAL_CLOSE, reason?: string) {
    this.closed = true;

    if (code === NORMAL_CLOSE) {
      void this.room?.leave();
    } else {
      this.room?.connection.close(code, reason);
    }

    this.readyState = GameConnection.CLOSED;
  }
}
