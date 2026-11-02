import { heroId } from './hero-id.ts';
import { randomUUID } from 'node:crypto';

// ISO-8601 seconds occupy nineteen characters before the UTC suffix.
const ISO_TIMESTAMP_SECONDS_LENGTH = 19;

export function steamCallback(loginUrl: string, steamId = heroId) {
  const callback = new URL(new URL(loginUrl).searchParams.get('openid.return_to')!);
  const identity = `https://steamcommunity.com/openid/id/${steamId}`;

  for (const [key, value] of Object.entries({
    ns: 'http://specs.openid.net/auth/2.0',
    mode: 'id_res',
    op_endpoint: 'https://steamcommunity.com/openid/login',
    claimed_id: identity,
    identity,
    return_to: callback.toString(),
    response_nonce: `${new Date().toISOString().slice(0, ISO_TIMESTAMP_SECONDS_LENGTH)}Z${randomUUID()}`,
    assoc_handle: 'test-association',
    sig: 'test-signature',
    signed: 'op_endpoint,claimed_id,identity,return_to,response_nonce,assoc_handle',
  })) {
    callback.searchParams.set(`openid.${key}`, value);
  }

  return callback;
}
