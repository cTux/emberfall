import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { request } from 'node:http';
import { fileURLToPath } from 'node:url';

// Bound a failed child startup or response instead of leaving CI waiting on a crashed server.
const TIMEOUT_MS = 10000;

for (const headers of [
  { host: '[' },
  { 'x-forwarded-proto': 'https, http' },
  { host: 'user@localhost' },
]) {
  test(
    `HTTP request construction rejects ${JSON.stringify(headers)} without exiting`,
    {
      timeout: TIMEOUT_MS,
    },
    async (t) => {
      const child = fork(
        fileURLToPath(new URL('./testing/http-request-server.ts', import.meta.url)),
        {
          windowsHide: true,
          execArgv: ['--unhandled-rejections=strict'],
          stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
        },
      );
      let stderr = '';
      child.stderr!.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      const closed = once(child, 'close');

      try {
        const [port] = await Promise.race([
          once(child, 'message', { signal: t.signal }),
          closed.then(() => {
            throw new Error(`HTTP server exited during startup: ${stderr}`);
          }),
        ]);
        assert.equal(typeof port, 'number');
        const call = (
          path: string,
          extraHeaders: Record<string, string | undefined> = {},
          method = 'GET',
        ) => {
          return new Promise<number>((resolve, reject) => {
            const req = request(
              {
                host: '127.0.0.1',
                port,
                path,
                method,
                headers: extraHeaders,
                signal: t.signal,
              },
              (res) => {
                res.resume();
                res.on('end', () => {
                  resolve(res.statusCode!);
                });
              },
            );
            req.on('error', reject);
            req.end();
          });
        };

        assert.equal(await call('/__healthcheck'), 200);
        assert.equal(await call('/__healthcheck', { 'x-forwarded-proto': 'https' }), 200);
        assert.equal(await call('/__healthcheck', headers), 400);
        assert.equal(await call('/matchmake/create/session', headers, 'POST'), 400);
        assert.equal(await call('/health'), 200);
        assert.equal(await call('/api/account'), 200);
        assert.equal(child.exitCode, null, stderr);
      } finally {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill();
        }

        await closed;
      }
    },
  );
}
