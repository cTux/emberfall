import { randomBytes, createHash } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { nicknameSchema, type AccountView } from "@emberfall/common-new";
import type { CharacterStore } from "./characters.ts";
import type { Peer } from "./network/peer.ts";
import { SteamProvider } from "./steam.ts";

const sessionCookie = "__Host-emberfall-session";
const loginCookie = "__Host-emberfall-login";
const lifetime = 7 * 24 * 60 * 60 * 1000;
const random = () => randomBytes(32).toString("hex");
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
function cookie(header: string | undefined, name: string) {
  const values = (header ?? "")
    .split(";")
    .map((value) => value.trim())
    .filter((value) => value.startsWith(`${name}=`));
  const value = values.length === 1 ? values[0].slice(name.length + 1) : "";
  return /^[a-f0-9]{64}$/.test(value) ? value : "";
}
function setCookie(name: string, value: string, seconds: number) {
  return `${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${seconds}`;
}
export interface SteamOptions {
  origin: string;
  apiKey: string;
  /** Dependency injection for isolated provider tests; never exposed over HTTP. */
  request?: typeof fetch;
}
export function steamOptionsFromEnv(): SteamOptions {
  const origin = process.env.STEAM_ORIGIN;
  const apiKey = process.env.STEAM_WEB_API_KEY;
  if (!origin || !apiKey)
    throw new Error("Set STEAM_ORIGIN and STEAM_WEB_API_KEY to enable Steam login.");
  return { origin, apiKey };
}
export class Accounts {
  readonly origin: string;
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
    const origin = new URL(options.origin);
    if (origin.protocol !== "https:" || origin.origin !== options.origin)
      throw new Error("STEAM_ORIGIN must be an HTTPS origin without a path or trailing slash.");
    this.origin = origin.origin;
    this.steam = new SteamProvider(options.apiKey, options.request);
    this.timer = setInterval(() => this.sweep(), 1000);
    this.timer.unref();
  }
  private sweep() {
    const now = Date.now();
    for (const map of [this.attempts, this.tickets, this.limits])
      for (const [key, value] of map) if (value.expires <= now) map.delete(key);
    for (const [peer, token] of this.peers) {
      if (!this.store.session(token)) peer.close(1008, "Session expired");
      if (peer.readyState === 3) this.peers.delete(peer);
    }
  }
  private limit(key: string, max: number) {
    this.sweep();
    const value = this.limits.get(key) ?? { count: 0, expires: Date.now() + 60_000 };
    if (this.limits.size >= 5000 && !this.limits.has(key))
      throw new Error("Too many requests. Try again shortly.");
    this.limits.set(key, value);
    if (++value.count > max) throw new Error("Too many requests. Try again shortly.");
  }
  consumeTicket(ticket: unknown) {
    if (typeof ticket !== "string") return undefined;
    const key = hash(ticket),
      saved = this.tickets.get(key);
    this.tickets.delete(key);
    if (!saved || saved.expires <= Date.now() || !this.store.session(saved.token)?.nickname)
      return undefined;
    return saved.token;
  }
  attach(peer: Peer, token: string) {
    this.peers.set(peer, token);
    return () => this.store.session(token);
  }
  valid(token: string) {
    return !!this.store.session(token)?.nickname;
  }
  close() {
    clearInterval(this.timer);
  }
  async handle(req: IncomingMessage & { body?: unknown }, res: ServerResponse) {
    const url = new URL(req.url ?? "/", this.origin);
    if (!url.pathname.startsWith("/auth/") && !url.pathname.startsWith("/api/account"))
      return false;
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    const json = (status: number, value: unknown) => {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify(value));
    };
    const redirect = (path: string) => {
      res.writeHead(303, { Location: path });
      res.end();
    };
    const token = cookie(req.headers.cookie, sessionCookie);
    try {
      if (req.method === "GET" && url.pathname === "/auth/steam") {
        this.limit(`login:${req.socket.remoteAddress}`, 20);
        if (this.attempts.size >= 5000) throw new Error("Login is busy. Try again shortly.");
        const state = random(),
          browser = random();
        this.attempts.set(state, { cookieHash: hash(browser), expires: Date.now() + 300_000 });
        res.setHeader("Set-Cookie", setCookie(loginCookie, browser, 300));
        redirect(this.steam.loginUrl(`${this.origin}/auth/steam/callback?state=${state}`));
        return true;
      }
      if (req.method === "GET" && url.pathname === "/auth/steam/callback") {
        const state = url.searchParams.get("state") ?? "";
        const attempt = this.attempts.get(state);
        if (
          !attempt ||
          attempt.expires <= Date.now() ||
          attempt.cookieHash !== hash(cookie(req.headers.cookie, loginCookie)) ||
          this.pending >= 8
        )
          throw new Error("Login expired. Please try again.");
        this.attempts.delete(state);
        this.pending++;
        try {
          const steamId = await this.steam.verify(
            url.searchParams,
            `${this.origin}/auth/steam/callback?state=${state}`,
          );
          let steamName = "";
          try {
            steamName = await this.steam.profile(steamId);
          } catch {
            /* Manual nickname entry remains available. */
          }
          this.store.loginSteam(steamId, steamName);
          const session = this.store.createSession(steamId, Date.now() + lifetime);
          this.store.revokeSession(token);
          this.sweep();
          res.setHeader("Set-Cookie", [
            setCookie(sessionCookie, session, lifetime / 1000),
            setCookie(loginCookie, "", 0),
          ]);
          redirect("/");
        } finally {
          this.pending--;
        }
        return true;
      }
      const account = this.store.session(token);
      if (req.method === "GET" && url.pathname === "/api/account") {
        const view: AccountView = {
          mode: "steam",
          authenticated: !!account,
          nickname: account?.nickname ?? null,
          steamName: account?.steamName ?? "",
        };
        json(200, view);
        return true;
      }
      if (!account) {
        json(401, { error: "Please sign in through Steam." });
        return true;
      }
      if (req.headers.origin !== this.origin || !["POST", "PATCH"].includes(req.method ?? "")) {
        json(403, { error: "Request origin is not allowed." });
        return true;
      }
      this.limit(`account:${account.steamId}`, 30);
      if (req.method === "POST" && url.pathname === "/api/account/ticket") {
        if (!account.nickname) {
          json(409, { error: "Choose your nickname first." });
          return true;
        }
        if (this.tickets.size >= 5000) throw new Error("Server is busy. Try again shortly.");
        const ticket = random();
        this.tickets.set(hash(ticket), { token, expires: Date.now() + 30_000 });
        json(200, { ticket });
      } else if (req.method === "POST" && url.pathname === "/auth/logout") {
        this.store.revokeSession(token);
        this.sweep();
        res.setHeader("Set-Cookie", setCookie(sessionCookie, "", 0));
        json(200, { ok: true });
      } else if (req.method === "PATCH" && url.pathname === "/api/account/nickname") {
        if (!req.headers["content-type"]?.startsWith("application/json"))
          throw new Error("Expected JSON.");
        let body = req.body;
        if (body !== undefined && Buffer.byteLength(JSON.stringify(body)) > 2048)
          throw new Error("Request too large.");
        if (body === undefined) {
          let raw = "";
          for await (const chunk of req) {
            raw += chunk;
            if (Buffer.byteLength(raw) > 2048) throw new Error("Request too large.");
          }
          body = JSON.parse(raw);
        }
        const parsed = nicknameSchema.safeParse(
          body && typeof body === "object" && "nickname" in body ? body.nickname : undefined,
        );
        if (!parsed.success) {
          json(400, { error: "Use 1–24 characters without invisible or control characters." });
          return true;
        }
        // Recheck after reading the body, which may have yielded to logout/expiry.
        if (!this.store.session(token)) {
          json(401, { error: "Please sign in again." });
          return true;
        }
        const updated = this.store.renameSteam(account.steamId, parsed.data);
        this.renamed(updated.characterId, parsed.data);
        json(200, {
          mode: "steam",
          authenticated: true,
          nickname: updated.nickname,
          steamName: updated.steamName,
        } satisfies AccountView);
      } else json(404, { error: "Not found" });
    } catch {
      if (url.pathname === "/auth/steam/callback") redirect("/?login=failed");
      else json(400, { error: "Unable to complete the request. Please try again." });
    }
    return true;
  }
}
