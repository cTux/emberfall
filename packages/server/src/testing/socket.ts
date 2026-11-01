import { NORMAL_CLOSE, CONNECTION_LOST } from '../network/codes.ts';
// Three matches the standard WebSocket CLOSED readyState in this test transport.
const CLOSED_STATE = 3;
import { RUNTIME } from '@emberfall/core/definitions/runtime';
import { EventEmitter } from 'node:events';
import { Client, type Room } from '@colyseus/sdk';
import { SessionState, materializeState } from '@emberfall/common/protocol';

/** Ports the existing behavioral assertions to a real Colyseus connection. */
export class WebSocket extends EventEmitter {
  static OPEN = 1;
  static CLOSED = CLOSED_STATE;
  readyState = 0;
  private room?: Room<SessionState>;

  constructor(url: string, _options?: unknown) {
    super();
    void this.connect(url);
  }

  private async connect(url: string) {
    try {
      const endpoint = new URL(url);
      endpoint.pathname = '/';
      this.room = await new Client(endpoint.toString()).create<SessionState>(
        'session',
        { protocolVersion: RUNTIME.protocolVersion },
        SessionState,
      );
      this.room.reconnection.enabled = false;
      this.room.onMessage('event', (data) => {
        return this.emit('message', Buffer.from(JSON.stringify(data)));
      });
      this.room.onStateChange((state) => {
        const world = materializeState(state);

        if (world) {
          this.emit('message', Buffer.from(JSON.stringify({ type: 'state', world })));
        }
      });
      this.room.onLeave((code) => {
        this.readyState = CLOSED_STATE;
        this.emit('close', code);
      });
      this.readyState = 1;
      this.emit('open');
    } catch (error) {
      this.emit('error', error);
    }
  }

  send(raw: string | Buffer) {
    let command: unknown;
    try {
      command = JSON.parse(raw.toString());
    } catch {
      command = raw.toString();
    }

    this.room?.send('command', command);
  }

  close(code = NORMAL_CLOSE) {
    if (code === NORMAL_CLOSE) {
      void this.room?.leave();
    } else {
      this.room?.connection.close(code);
    }
  }

  terminate() {
    this.room?.connection.close(CONNECTION_LOST);
  }
}
