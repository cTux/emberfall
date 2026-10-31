import test from 'node:test';
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGameServer } from './worlds.ts';
import { connectWorkload } from '../scripts/runtime-clients.ts';

test('benchmark worker refuses an existing database before startup', async (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'emberfall-runtime-benchmark-'));
  const path = join(directory, 'characters.sqlite');
  const original = 'Existing database sentinel: must remain untouched';
  writeFileSync(path, original);
  const child = fork(
    fileURLToPath(new URL('../scripts/runtime-worker.ts', import.meta.url)),
    [path, '1'],
    {
      windowsHide: true,
      execArgv: [],
      stdio: ['ignore', 'ignore', 'ignore', 'ipc'],
    },
  );
  const closed = new Promise<void>((resolve) => child.once('close', () => resolve()));
  try {
    const [code] = await once(child, 'exit', {
      signal: AbortSignal.any([t.signal, AbortSignal.timeout(10000)]),
    });
    assert.equal(code, 1);
    assert.equal(readFileSync(path, 'utf8'), original);
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await closed;
    const target = realpathSync(directory);
    assert.equal(dirname(target), realpathSync(tmpdir()));
    assert(basename(target).startsWith('emberfall-runtime-benchmark-'));
    rmSync(target, { recursive: true });
  }
});

test('benchmark clients close after their server disconnects', { timeout: 10000 }, async () => {
  const app = await createGameServer(undefined, ':memory:', undefined, undefined, {
    generate: async () => ({ status: 'busy' }),
  });
  let clients: Awaited<ReturnType<typeof connectWorkload>> | undefined;
  let serverClosed = false;
  try {
    await app.listen(0);
    const address = app.server.address();
    assert(address && typeof address !== 'string');
    clients = await connectWorkload(address.port, 1);
    await app.close();
    serverClosed = true;
    await clients.close();
  } finally {
    if (!serverClosed) await app.close();
    await clients?.close();
  }
});
