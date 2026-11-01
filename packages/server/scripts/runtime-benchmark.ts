// Retain eight thousand characters of worker failure evidence while bounding memory.
const STDERR_TAIL_LENGTH = 8000;
// Allow thirty seconds for cold worker startup.
const WORKER_START_TIMEOUT_MS = 30000;
// Two-space indentation keeps benchmark JSON artifacts readable.
const JSON_INDENT = 2;
import assert from 'node:assert/strict';
import { fork, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir, cpus, availableParallelism, totalmem, release } from 'node:os';
import { basename, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { setTimeout as pause } from 'node:timers/promises';
import { BENCHMARK } from './runtime-workload.ts';
import { connectWorkload } from './runtime-clients.ts';
import type { WorkerReply } from './runtime-worker.ts';

async function measure(worlds: number) {
  const directory = mkdtempSync(join(tmpdir(), 'emberfall-runtime-benchmark-'));
  const child = fork(
    fileURLToPath(new URL('./runtime-worker.ts', import.meta.url)),
    [join(directory, 'characters.sqlite'), String(worlds)],
    { windowsHide: true, execArgv: [], stdio: ['ignore', 'ignore', 'pipe', 'ipc'] },
  );
  const stopped = new Promise<void>((resolve) => {
    return child.once('close', () => {
      return resolve();
    });
  });
  const exited = new AbortController();
  child.once('error', (error) => {
    return exited.abort(error);
  });
  child.once('exit', (code) => {
    return exited.abort(new Error(`Benchmark server exited: ${code}`));
  });
  let stderr = '';
  child.stderr!.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-STDERR_TAIL_LENGTH);
  });
  const receive = async () => {
    const [message] = await once(child, 'message', {
      signal: AbortSignal.any([exited.signal, AbortSignal.timeout(WORKER_START_TIMEOUT_MS)]),
    });
    const reply = message as WorkerReply;
    assert(reply.type !== 'error', reply.type === 'error' ? reply.message : '');

    return reply;
  };

  const command = async (type: 'arrange' | 'measure' | 'finish' | 'stop') => {
    const response = receive();
    child.send(type);
    const reply = await response;
    assert.equal(reply.type, type);

    return reply;
  };

  let clients: Awaited<ReturnType<typeof connectWorkload>> | undefined;
  try {
    const ready = await receive();
    assert(ready.type === 'ready');
    clients = await connectWorkload(ready.port, worlds);
    const arranged = await command('arrange');
    assert(arranged.type === 'arrange');
    clients.startInputs(arranged.scenes);
    await pause(BENCHMARK.warmupMs);
    await command('measure');
    clients.begin();
    const cpu = process.cpuUsage();
    const start = performance.now();
    await pause(BENCHMARK.sampleMs);
    const measuredMs = performance.now() - start;
    const client = clients.finish(measuredMs);
    const usage = process.cpuUsage(cpu);
    const finished = await command('finish');
    assert(finished.type === 'finish');
    const server = finished.metrics;
    assert(server.measuredMs >= BENCHMARK.sampleMs);
    assert(server.socketBytes > 0 && Number.isFinite(server.loopDelayP95Ms));
    await clients.close();
    clients = undefined;
    await command('stop');
    await stopped;
    assert.equal(child.exitCode, 0, stderr);

    return {
      occupiedWorlds: worlds,
      server,
      client: {
        ...client,
        measuredMs,
        driverCpuOneCorePercent: ((usage.user + usage.system) / 1000 / measuredMs) * 100,
      },
    };
  } catch (error) {
    throw new Error(`Workload ${worlds} failed. ${stderr}`, { cause: error });
  } finally {
    if (child.exitCode === null && child.signalCode === null) {
      child.kill();
    }

    await stopped;
    await clients?.close();
    const target = realpathSync(directory);
    assert(target.startsWith(realpathSync(tmpdir()) + sep));
    assert(basename(target).startsWith('emberfall-runtime-benchmark-'));
    rmSync(target, { recursive: true });
  }
}

const sourceRevision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const sourceDirty = !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim();
const workloads = [];

for (const worlds of BENCHMARK.worlds) {
  console.error(
    `Measuring ${worlds} occupied worlds (${worlds * BENCHMARK.playersPerWorld} SDK clients)`,
  );
  workloads.push(await measure(worlds));
}

console.log(
  JSON.stringify(
    {
      measuredAt: new Date().toISOString(),
      sourceRevision,
      sourceDirty,
      host: {
        node: process.version,
        platform: process.platform,
        release: release(),
        arch: process.arch,
        cpu: cpus()[0].model.trim(),
        logicalCpus: availableParallelism(),
        memoryGiB: totalmem() / 2 ** 30,
      },
      config: BENCHMARK,
      scope:
        'Production simulation, viewer projection, native SDK/schema transport and disk SQLite autosaves; localhost HTTP, fixture healing, no Steam/TLS/LLM workload',
      transport:
        'Server socket bytes written after warmup; includes WebSocket framing/heartbeats, excludes TCP/IP overhead',
      workloads,
    },
    null,
    JSON_INDENT,
  ),
);
