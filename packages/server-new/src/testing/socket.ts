import { RUNTIME } from "@emberfall/common-new/definitions/runtime";
import { EventEmitter } from "node:events";
import { Client, type Room } from "@colyseus/sdk";
import { SessionState, materializeState } from "@emberfall/common-new/protocol";

/** Ports the existing behavioral assertions to a real Colyseus connection. */
export class WebSocket extends EventEmitter {
  static OPEN = 1;
  static CLOSED = 3;
  readyState = 0;
  private room?: Room<SessionState>;
  constructor(url: string, _options?: unknown) {
    super();
    void this.connect(url);
  }
  private async connect(url: string) {
    try {
      const endpoint = new URL(url);
      endpoint.pathname = "/";
      this.room = await new Client(endpoint.toString()).create<SessionState>(
        "session",
        { protocolVersion: RUNTIME.protocolVersion },
        SessionState,
      );
      this.room.reconnection.enabled = false;
      this.room.onMessage("event", (data) =>
        this.emit("message", Buffer.from(JSON.stringify(data))),
      );
      this.room.onStateChange((state) => {
        const world = materializeState(state);
        if (world) this.emit("message", Buffer.from(JSON.stringify({ type: "state", world })));
      });
      this.room.onLeave((code) => {
        this.readyState = 3;
        this.emit("close", code);
      });
      this.readyState = 1;
      this.emit("open");
    } catch (error) {
      this.emit("error", error);
    }
  }
  send(raw: string | Buffer) {
    let command: unknown;
    try {
      command = JSON.parse(raw.toString());
    } catch {
      command = raw.toString();
    }
    this.room?.send("command", command);
  }
  close(code = 1000) {
    if (code === 1000) void this.room?.leave();
    else this.room?.connection.close(code);
  }
  terminate() {
    this.room?.connection.close(4001);
  }
}
