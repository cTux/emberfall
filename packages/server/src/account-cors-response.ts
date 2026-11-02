import type { IncomingMessage, ServerResponse } from 'node:http';
import { constants as httpConstants } from 'node:http2';

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
