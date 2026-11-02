import { friendId } from './friend-id.ts';

/** Fake upstream only; tests still exercise the complete OpenID verifier. */
export const steamRequest: typeof fetch = async (input, init) => {
  const url = new URL(input instanceof Request ? input.url : input);

  if (url.hostname === 'steamcommunity.com') {
    const query = new URLSearchParams(
      typeof init?.body === 'string'
        ? init.body
        : init?.body instanceof URLSearchParams
          ? init.body
          : undefined,
    );

    return new Response(
      `ns:http://specs.openid.net/auth/2.0\nis_valid:${query.get('openid.sig') === 'test-signature'}\n`,
    );
  }

  const steamid = url.searchParams.get('steamids');

  return Response.json({
    response: {
      players: [{ steamid, personaname: steamid === friendId ? 'Steam Friend' : 'Steam Hero' }],
    },
  });
};
