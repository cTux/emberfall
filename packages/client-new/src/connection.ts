import { RUNTIME } from "@emberfall/common-new/definitions/runtime";
import { Client, type Room } from "@colyseus/sdk";
import { SessionState, materializeState } from "@emberfall/common-new/protocol";
import type { ServerMessage, ClientMessage } from "@emberfall/common-new";

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
      endpoint.pathname = "/";
      const options =
        typeof location !== "undefined" && import.meta.env?.DEV
          ? {
              urlBuilder: (url: URL) => {
                if (url.protocol.startsWith("ws")) url.pathname = `/colyseus${url.pathname}`;
                return url.toString();
              },
            }
          : undefined;
      let ticket: string | undefined;
      if (this.steam) {
        const response = await fetch("/api/account/ticket", {
          method: "POST",
          credentials: "same-origin",
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error("Authentication required");
        ticket = (await response.json()).ticket;
      }
      const room = await new Client(endpoint.toString(), options).create<SessionState>(
        "session",
        { protocolVersion: RUNTIME.protocolVersion, ticket },
        SessionState,
      );
      this.room = room;
      room.reconnection.enabled = false;
      if (this.closed) {
        await room.leave();
        return;
      }
      room.onMessage("event", (message: ServerMessage) => this.onmessage?.({ data: message }));
      room.onStateChange((state) => {
        const world = materializeState(state);
        if (world) this.onmessage?.({ data: { type: "state", world } });
      });
      room.onLeave(() => {
        this.readyState = GameConnection.CLOSED;
        this.onclose?.();
      });
      room.onError(() => this.onerror?.());
      this.readyState = GameConnection.OPEN;
      this.onopen?.();
      room.send("command", { type: "ping", id: 1 });
    } catch {
      if (!this.closed) {
        this.onerror?.();
        this.readyState = GameConnection.CLOSED;
        this.onclose?.();
      }
    }
  }
  send(data: ClientMessage) {
    if (this.readyState === GameConnection.OPEN) this.room?.send("command", data);
  }
  close(code = 1000, reason?: string) {
    this.closed = true;
    if (code === 1000) void this.room?.leave();
    else this.room?.connection.close(code, reason);
    this.readyState = GameConnection.CLOSED;
  }
}
