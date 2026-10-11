import { randomUUID } from "node:crypto";

export const heroId = "76561198000000001";
export const friendId = "76561198000000002";
/** Fake upstream only; tests still exercise the complete OpenID verifier. */
export const steamRequest: typeof fetch = async (input, init) => {
  const url = new URL(String(input));
  if (url.hostname === "steamcommunity.com") {
    const query = new URLSearchParams(String(init?.body));
    return new Response(
      `ns:http://specs.openid.net/auth/2.0\nis_valid:${query.get("openid.sig") === "test-signature"}\n`,
    );
  }
  const steamid = url.searchParams.get("steamids");
  return Response.json({
    response: {
      players: [{ steamid, personaname: steamid === friendId ? "Steam Friend" : "Steam Hero" }],
    },
  });
};
export function steamCallback(loginUrl: string, steamId = heroId) {
  const callback = new URL(new URL(loginUrl).searchParams.get("openid.return_to")!);
  const identity = `https://steamcommunity.com/openid/id/${steamId}`;
  for (const [key, value] of Object.entries({
    ns: "http://specs.openid.net/auth/2.0",
    mode: "id_res",
    op_endpoint: "https://steamcommunity.com/openid/login",
    claimed_id: identity,
    identity,
    return_to: callback.toString(),
    response_nonce: `${new Date().toISOString().slice(0, 19)}Z${randomUUID()}`,
    assoc_handle: "test-association",
    sig: "test-signature",
    signed: "op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle",
  }))
    callback.searchParams.set(`openid.${key}`, value);
  return callback;
}
