const endpoint = "https://steamcommunity.com/openid/login";
const namespace = "http://specs.openid.net/auth/2.0";

/** Fixed-provider OpenID 2.0 direct verification. No user-selected discovery URLs. */
export class SteamProvider {
  private nonces = new Map<string, number>();
  private apiKey: string;
  private request: typeof fetch;
  constructor(apiKey: string, request: typeof fetch = fetch) {
    this.apiKey = apiKey;
    this.request = request;
  }
  loginUrl(returnTo: string) {
    const url = new URL(endpoint);
    url.search = new URLSearchParams({
      "openid.ns": namespace,
      "openid.mode": "checkid_setup",
      "openid.realm": new URL(returnTo).origin,
      "openid.return_to": returnTo,
      "openid.identity": `${namespace}/identifier_select`,
      "openid.claimed_id": `${namespace}/identifier_select`,
    }).toString();
    return url.toString();
  }
  async verify(query: URLSearchParams, returnTo: string) {
    const now = Date.now();
    for (const [nonce, expires] of this.nonces) if (expires <= now) this.nonces.delete(nonce);
    const get = (key: string) => query.get(`openid.${key}`) ?? "";
    const signed = get("signed").split(",");
    const identity = get("claimed_id");
    const match = /^https?:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/.exec(identity);
    const nonce = get("response_nonce");
    const issued = Date.parse(nonce.slice(0, 20));
    if (
      [...query.keys()].some((key) => query.getAll(key).length !== 1) ||
      get("ns") !== namespace ||
      get("mode") !== "id_res" ||
      get("op_endpoint") !== endpoint ||
      get("return_to") !== returnTo ||
      !match ||
      BigInt(match[1]) < 76561197960265729n ||
      BigInt(match[1]) > 76561202255233023n ||
      get("identity") !== identity ||
      !get("sig") ||
      !get("assoc_handle") ||
      ![
        "op_endpoint",
        "claimed_id",
        "identity",
        "return_to",
        "response_nonce",
        "assoc_handle",
      ].every((key) => signed.includes(key)) ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z.+$/.test(nonce) ||
      !Number.isFinite(issued) ||
      issued < now - 300_000 ||
      issued > now + 60_000 ||
      this.nonces.has(nonce) ||
      this.nonces.size >= 5000
    ) {
      throw new Error("Steam login could not be verified. Please try again.");
    }
    // Reserve before yielding so simultaneous replays cannot both succeed.
    this.nonces.set(nonce, now + 360_000);
    const body = new URLSearchParams([...query].filter(([key]) => key.startsWith("openid.")));
    body.set("openid.mode", "check_authentication");
    const response = await this.request(endpoint, {
      method: "POST",
      body,
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok || !(await response.text()).split(/\r?\n/).includes("is_valid:true"))
      throw new Error("Steam login could not be verified. Please try again.");
    return match[1];
  }
  async profile(steamId: string) {
    const url = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/");
    url.searchParams.set("key", this.apiKey);
    url.searchParams.set("steamids", steamId);
    const response = await this.request(url, {
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Steam profile unavailable");
    const body = await response.json();
    const player = body?.response?.players?.find(
      (value: { steamid?: string }) => value.steamid === steamId,
    );
    if (typeof player?.personaname !== "string") throw new Error("Steam profile unavailable");
    return player.personaname.slice(0, 256);
  }
}
