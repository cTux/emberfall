import type { ServerMessage } from "@emberfall/common-new";
import { Encoder } from "@colyseus/schema";
import { RUNTIME } from "@emberfall/common-new/definitions/runtime";
import { createServer } from "node:http";
import { once } from "node:events";
import { createServer as createSecureServer, type ServerOptions } from "node:https";
import { Server, Room, ServerError, type Client } from "@colyseus/core";
import { WebSocketTransport, type WebSocketClient } from "@colyseus/ws-transport";
import {
  SessionState,
  prepareState,
  applyState,
  type PreparedState,
} from "@emberfall/common-new/protocol";
import { createRuntime } from "./runtime.ts";
import { Peer } from "./network/peer.ts";
import { staticHandler } from "./http/static.ts";

/** Private session rooms preserve world browsing and transfers on one SDK connection. */
export async function createGameServer(
  staticRoot?: string,
  savePath = ":memory:",
  tls?: ServerOptions,
) {
  Encoder.BUFFER_SIZE = 128 * 1024;
  const runtime = await createRuntime(savePath);
  const projections = new WeakMap<object, PreparedState>();
  function replicate(
    state: SessionState,
    message: Extract<ServerMessage, { type: "state" | "joined" }>,
  ) {
    let projection = projections.get(message);
    if (!projection) {
      projection = prepareState(message.world);
      projections.set(message, projection);
    }
    applyState(state, projection);
  }
  class SessionRoom extends Room<{ state: SessionState }> {
    state = new SessionState();
    maxClients = 1;
    private peer?: Peer;
    onCreate(options: { protocolVersion?: number }) {
      if (options.protocolVersion !== RUNTIME.protocolVersion)
        throw new ServerError(4002, "Client protocol version is incompatible. Reload the game.");
      this.setPrivate(true);
      this.setPatchRate(50);
      this.onMessage("command", (_client, command) => this.peer?.receive(command));
    }
    onJoin(client: Client) {
      this.peer = new Peer(
        (message) => {
          if (message.type === "state") replicate(this.state, message);
          else {
            if (message.type === "joined") replicate(this.state, message);
            if (message.type === "left") {
              this.state.header = "";
              this.state.entities.clear();
            }
            client.send("event", message);
          }
        },
        (code) => client.leave(code === 1006 ? 4001 : code),
        () => (client as WebSocketClient).ref.bufferedAmount,
      );
      runtime.connect(this.peer);
    }
    onLeave(_client: Client, code: number) {
      this.peer?.detached(code === 4000 ? 1000 : code === 1008 ? 1008 : 1006);
    }
  }
  const handler = staticHandler(staticRoot);
  const server = tls ? createSecureServer(tls) : createServer();
  const transport = new WebSocketTransport({
    server,
    maxPayload: 4096,
    pingInterval: 15000,
    pingMaxRetries: 1,
    beforeUpgrade: (request) => {
      const origin = request.headers.get("origin");
      try {
        if (origin && new URL(origin).host !== request.headers.get("host"))
          return new Response("Forbidden", { status: 403 });
      } catch {
        return new Response("Forbidden", { status: 403 });
      }
    },
  });
  const game = new Server({
    transport,
    greet: false,
    gracefullyShutdown: false,
    express: (app) => {
      app.get("/", handler);
      app.use(handler);
    },
  });
  game.define("session", SessionRoom);

  return {
    server,
    runtime,
    async listen(port: number, host = "127.0.0.1") {
      if (port !== 0) return game.listen(port, host);
      // The ws transport treats zero as its default port. Bind through the public
      // externally-hosted-server API so tests get a real OS-assigned free port.
      await game.serverless();
      const listening = once(server, "listening");
      server.listen(0, host);
      await listening;
    },
    async close() {
      try {
        await runtime.close();
      } finally {
        await game.gracefullyShutdown(false);
      }
    },
  };
}
