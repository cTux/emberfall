import { EventEmitter } from "node:events";
import type { ServerMessage } from "@emberfall/common-new";

/** Transport-neutral connection consumed by the authoritative application. */
export class Peer extends EventEmitter {
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  readyState = Peer.OPEN;
  private pendingBytes: () => number;
  get bufferedAmount() {
    return this.pendingBytes();
  }
  private deliver: (message: ServerMessage) => void;
  private disconnect: (code: number) => void;
  constructor(
    deliver: (message: ServerMessage) => void,
    disconnect: (code: number) => void,
    pendingBytes = () => 0,
  ) {
    super();
    this.deliver = deliver;
    this.disconnect = disconnect;
    this.pendingBytes = pendingBytes;
  }
  send(message: ServerMessage) {
    if (this.readyState === Peer.OPEN) this.deliver(message);
  }
  receive(data: unknown) {
    this.emit("command", data);
  }
  ping() {
    this.emit("pong");
  }
  close(code = 1000, _reason?: string) {
    if (this.readyState === Peer.CLOSED) return;
    this.readyState = Peer.CLOSED;
    this.disconnect(code);
    this.emit("close", code);
  }
  terminate() {
    this.close(1006);
  }
  detached(code = 1006) {
    if (this.readyState === Peer.CLOSED) return;
    this.readyState = Peer.CLOSED;
    this.emit("close", code);
  }
}
