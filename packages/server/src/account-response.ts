import { constants as httpConstants } from 'node:http2';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { nicknameSchema, type AccountView } from '@emberfall/common';
import type { CharacterStore } from './characters.ts';

export function accountView(account: ReturnType<CharacterStore['session']>): AccountView {
  return {
    mode: 'steam',
    authenticated: !!account,
    nickname: nicknameSchema.safeParse(account?.nickname).success ? account!.nickname : null,
    steamName: account?.steamName ?? '',
  };
}

export function accountResponse(req: IncomingMessage, res: ServerResponse, clientOrigin: string) {
  res.setHeader('Vary', 'Origin');

  if (req.headers.origin && req.headers.origin !== clientOrigin) {
    res.removeHeader('Access-Control-Allow-Origin');
    res.writeHead(httpConstants.HTTP_STATUS_FORBIDDEN);
    res.end();

    return undefined;
  }

  res.setHeader('Access-Control-Allow-Origin', clientOrigin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  const json = (status: number, value: unknown) => {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(value));
  };

  const redirect = (path: string) => {
    res.writeHead(httpConstants.HTTP_STATUS_SEE_OTHER, { Location: path });
    res.end();
  };

  return { json, redirect };
}
