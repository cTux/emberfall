import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { OllamaNpcDialogue } from './npc-models.ts';
import { signal, answer, defaults } from './npc-models.fixture.ts';

beforeEach((t) => {
  if ('mock' in t) {
    t.mock.method(console, 'info', () => {});
  }
});

test('concurrency is bounded; cancellation releases slots without poisoning shared health', async (t) => {
  const log = t.mock.method(console, 'info', () => {});
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    if (++calls > 2) {
      return answer();
    }

    return new Promise((_resolve, reject) => {
      return options?.signal?.addEventListener(
        'abort',
        () => {
          return reject(new Error('aborted'));
        },
        {
          once: true,
        },
      );
    });
  };

  const pool = new OllamaNpcDialogue(
    request,
    () => {
      return 0;
    },
    defaults,
  );
  const abort = new AbortController();
  const a = pool.generate('{}', abort.signal),
    b = pool.generate('{}', abort.signal);
  assert.deepEqual(await pool.generate('{}', signal()), { status: 'busy' });
  abort.abort();
  await Promise.all([a, b]);
  assert.equal(calls, 2);
  assert.equal(log.mock.callCount(), 0);
  assert.deepEqual(await pool.generate('{}', abort.signal), { status: 'unavailable' });
  assert.equal(calls, 2);
  assert.equal((await pool.generate('{}', signal())).status, 'ok');
});

test('deadline bounds loading and body reads and permits recovery after cooldown', async (t) => {
  const lines: string[] = [];
  t.mock.method(console, 'info', (line: string) => {
    return lines.push(line);
  });
  for (const stallBody of [false, true]) {
    let now = 0,
      calls = 0;
    const request: typeof fetch = async (_url, options) => {
      if (++calls > 1) {
        return answer();
      }

      const keepAlive = setTimeout(() => {}, 500);
      if (stallBody) {
        return new Response(
          new ReadableStream({
            start(controller) {
              options?.signal?.addEventListener(
                'abort',
                () => {
                  clearTimeout(keepAlive);
                  controller.error(new Error('private timeout'));
                },
                { once: true },
              );
            },
          }),
        );
      }

      return new Promise((_resolve, reject) => {
        options?.signal?.addEventListener(
          'abort',
          () => {
            clearTimeout(keepAlive);
            reject(new Error('private timeout'));
          },
          { once: true },
        );
      });
    };

    const pool = new OllamaNpcDialogue(
      request,
      () => {
        return now;
      },
      { ...defaults, timeoutMs: 10 },
    );
    assert.deepEqual(await pool.generate('{}', signal()), { status: 'unavailable' });
    assert.equal(calls, 1);
    now = 60_001;
    assert.equal((await pool.generate('{}', signal())).status, 'ok');
  }

  assert.equal(lines.length, 4);
  assert(
    lines.filter((line) => {
      return line.includes('"reason":"timeout"');
    }).length === 2,
  );
  assert(
    lines.filter((line) => {
      return line.includes('NPC dialogue provider recovered');
    }).length === 2,
  );
  assert(!lines.join('\n').includes('private'));
});
