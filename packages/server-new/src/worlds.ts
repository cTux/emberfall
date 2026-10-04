import type { ServerMessage } from "@emberfall/common-new";
import { Encoder } from "@colyseus/schema";
import { RUNTIME } from "@emberfall/common-new/definitions/runtime";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
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
import { Accounts, type SteamOptions } from "./accounts.ts";

/** Private session rooms preserve world browsing and transfers on one SDK connection. */
export async function createGameServer(
  staticRoot?: string,
  savePath = ":memory:",
  tls?: ServerOptions,
  steam?: SteamOptions,
) {
  Encoder.BUFFER_SIZE = 128 * 1024;
  const runtime = await createRuntime(savePath);
  // The executable always supplies Steam configuration. Omission is for the
  // isolated legacy/parity fixtures, which exercise the pre-account protocol.
  const accounts = steam
    ? new Accounts(runtime.characters, steam, runtime.renameCharacter)
    : undefined;
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
    onAuth(_client: Client, options: { ticket?: string }, context: { headers: Headers }) {
      if (!accounts) return true;
      if (context.headers.get("origin") !== accounts.origin)
        throw new ServerError(401, "Invalid origin");
      const token = accounts.consumeTicket(options.ticket);
      if (!token) throw new ServerError(401, "Please sign in again");
      return token;
    }
    onCreate(options: { protocolVersion?: number }) {
      if (options.protocolVersion !== RUNTIME.protocolVersion)
        throw new ServerError(4002, "Client protocol version is incompatible. Reload the game.");
      this.setPrivate(true);
      this.setPatchRate(50);
      this.onMessage("command", (_client, command) => this.peer?.receive(command));
    }
    onJoin(client: Client) {
      if (accounts && (typeof client.auth !== "string" || !accounts.valid(client.auth)))
        throw new ServerError(401, "Please sign in again");
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
      runtime.connect(
        this.peer,
        accounts ? accounts.attach(this.peer, client.auth as string) : undefined,
      );
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
        if (accounts && origin !== accounts.origin)
          return new Response("Forbidden", { status: 403 });
        if (!accounts && origin && new URL(origin).host !== request.headers.get("host"))
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
      app.use((req: IncomingMessage, res: ServerResponse, next: (error?: unknown) => void) => {
        if (accounts)
          void accounts
            .handle(req, res)
            .then((handled) => {
              if (!handled) next();
            })
            .catch(next);
        else if (req.url === "/api/account") {
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({ mode: "legacy", authenticated: false, nickname: null, steamName: "" }),
          );
        } else next();
      });
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
      accounts?.close();
      try {
        await runtime.close();
      } finally {
        await game.gracefullyShutdown(false);
      }
    },
  };
}
