// Two KiB retains the existing small JSON request budget before parsing.
const MAX_ACCOUNT_BODY_BYTES = 2048;

import type { IncomingMessage } from 'node:http';

export async function readAccountBody(req: IncomingMessage & { body?: unknown }) {
  let body = req.body;

  if (body !== undefined && Buffer.byteLength(JSON.stringify(body)) > MAX_ACCOUNT_BODY_BYTES) {
    throw new Error('Request too large.');
  }

  if (body === undefined) {
    let raw = '';

    for await (const chunk of req) {
      raw += chunk;

      if (Buffer.byteLength(raw) > MAX_ACCOUNT_BODY_BYTES) {
        throw new Error('Request too large.');
      }
    }

    body = JSON.parse(raw);
  }

  return body;
}
