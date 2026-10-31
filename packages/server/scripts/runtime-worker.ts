import assert from 'node:assert/strict';
import { existsSync, realpathSync } from 'node:fs';
import { basename, dirname, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import type { Socket } from 'node:net';
import { createGameServer } from '../src/worlds.ts';
import { arrangeWorkload, BENCHMARK } from './runtime-workload.ts';

export interface ServerMetrics {
  measuredMs: number;
  cpuOneCorePercent: number;
  rssMiB: number;
  peakRssMiB: number;
  loopDelayP95Ms: number;
  loopDelayMaxMs: number;
  socketBytes: number;
  socketBytesPerSecond: number;
  workload: ReturnType<ReturnType<typeof arrangeWorkload>['check']>;
}
export type WorkerReply =
  | { type: 'ready'; port: number }
  | { type: 'arrange'; scenes: Record<string, string> }
  | { type: 'measure' | 'stop' }
  | { type: 'finish'; metrics: ServerMetrics }
  | { type: 'error'; message: string };

assert(typeof process.send === 'function', 'This fixture must be started by runtime-benchmark.ts');
const savePath = resolve(process.argv[2]);
const root = realpathSync(dirname(savePath));
assert(root.startsWith(realpathSync(tmpdir()) + sep));
assert(basename(root).startsWith('emberfall-runtime-benchmark-'));
assert.equal(basename(savePath), 'characters.sqlite');
assert(!existsSync(savePath), 'Never open an existing save database');
const count = Number(process.argv[3]);
assert(
  BENCHMARK.worlds.some((value) => {
    return value === count;
  }),
);
const app = await createGameServer(undefined, savePath, undefined, undefined, {
  generate: async () => {
    return { status: 'busy' };
  },
});
const sockets = new Set<Socket>();
let closedBytes = 0;
app.server.on('connection', (socket) => {
  sockets.add(socket);
  socket.once('close', () => {
    closedBytes += socket.bytesWritten;
    sockets.delete(socket);
  });
});
const bytes = () => {
  return (
    closedBytes +
    [...sockets].reduce((sum, socket) => {
      return sum + socket.bytesWritten;
    }, 0)
  );
};

const delay = monitorEventLoopDelay({ resolution: 10 });
let workload: ReturnType<typeof arrangeWorkload> | undefined;
let started = 0;
let initialBytes = 0;
let cpu = process.cpuUsage();
let peakRss = 0;
const memory = setInterval(() => {
  peakRss = Math.max(peakRss, process.memoryUsage().rss);
}, 250);
let closing = false;

async function close() {
  if (closing) {
    return;
  }

  closing = true;
  clearInterval(memory);
  workload?.close();
  delay.disable();
  await app.close();
}

process.once('disconnect', () => {
  void close().catch(() => {
    return process.exit(1);
  });
});

async function command(type: unknown) {
  let reply: WorkerReply;
  switch (type) {
    case 'arrange': {
      assert(!workload);
      workload = arrangeWorkload(app.runtime.worlds, app.runtime.parties, count);
      for (const world of app.runtime.worlds.values()) {
        for (const player of world.players.values()) {
          (world.chat ??= []).push({
            id: `private:${player.id}`,
            playerId: '',
            name: 'Benchmark',
            text: `benchmark-private:${player.id}`,
            recipientIds: [player.id],
            dimension: 'forest',
          });
        }
      }

      reply = { type, scenes: workload.scenes };
      break;
    }

    case 'measure': {
      assert(workload);
      workload.reset();
      peakRss = process.memoryUsage().rss;
      initialBytes = bytes();
      delay.reset();
      delay.enable();
      cpu = process.cpuUsage();
      started = performance.now();
      reply = { type };
      break;
    }

    case 'finish': {
      assert(workload && started);
      const measuredMs = performance.now() - started;
      const usage = process.cpuUsage(cpu);
      delay.disable();
      const socketBytes = bytes() - initialBytes;
      reply = {
        type,
        metrics: {
          measuredMs,
          cpuOneCorePercent: ((usage.user + usage.system) / 1000 / measuredMs) * 100,
          rssMiB: process.memoryUsage().rss / 2 ** 20,
          peakRssMiB: peakRss / 2 ** 20,
          loopDelayP95Ms: delay.percentile(95) / 1e6,
          loopDelayMaxMs: delay.max / 1e6,
          socketBytes,
          socketBytesPerSecond: socketBytes / (measuredMs / 1000),
          workload: workload.check(),
        },
      };
      break;
    }

    case 'stop': {
      await close();
      reply = { type };
      break;
    }

    default: {
      throw new Error('Unknown benchmark command');
    }
  }

  process.send!(reply);
  if (type === 'stop') {
    process.disconnect!();
  }
}

process.on('message', (type) => {
  void command(type).catch((error: unknown) => {
    process.send!({ type: 'error', message: String(error) } satisfies WorkerReply);
  });
});
await app.listen(0);
const address = app.server.address();
assert(address && typeof address !== 'string');
process.send({ type: 'ready', port: address.port } satisfies WorkerReply);
