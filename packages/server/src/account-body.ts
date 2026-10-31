import type { IncomingMessage } from 'node:http';

export async function readAccountBody(req: IncomingMessage & { body?: unknown }) {
  let body = req.body;
  if (body !== undefined && Buffer.byteLength(JSON.stringify(body)) > 2048) {
    throw new Error('Request too large.');
  }

  if (body === undefined) {
    let raw = '';
    for await (const chunk of req) {
      raw += chunk;
      if (Buffer.byteLength(raw) > 2048) {
        throw new Error('Request too large.');
      }
    }

    body = JSON.parse(raw);
  }

  return body;
}
