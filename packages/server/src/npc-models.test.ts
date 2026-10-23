import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FreeNpcModels, FREE_NPC_MODELS } from './npc-models.ts';
const signal = () => new AbortController().signal;
const answer = (content = 'Welcome, traveller!') =>
  Response.json({ choices: [{ message: { content } }] });

test('free models fail over on limits, honor cooldowns, and never select paid routes', async () => {
  let now = 1000;
  const calls: string[] = [];
  const request: typeof fetch = async (_url, options) => {
    const model = JSON.parse(options?.body as string).model as string;
    calls.push(model);
    assert(FREE_NPC_MODELS.includes(model as (typeof FREE_NPC_MODELS)[number]));
    return model === FREE_NPC_MODELS[0]
      ? new Response('', { status: 429, headers: { 'Retry-After': '120' } })
      : answer();
  };
  const pool = new FreeNpcModels(request, () => now, undefined);
  assert.equal((await pool.generate('hello', signal())).status, 'ok');
  assert.deepEqual(calls, FREE_NPC_MODELS.slice(0, 2));
  await pool.generate('again', signal());
  assert.equal(calls.at(-1), FREE_NPC_MODELS[1]);
  now += 1000;
});

test('all failures cool models down; cooldown expiry permits recovery', async () => {
  let now = 0,
    calls = 0,
    available = false;
  const request: typeof fetch = async () => {
    calls++;
    return available ? answer() : new Response('', { status: 503 });
  };
  const pool = new FreeNpcModels(request, () => now, undefined);
  assert.equal((await pool.generate('hello', signal())).status, 'unavailable');
  assert.equal(calls, FREE_NPC_MODELS.length);
  await pool.generate('hello', signal());
  assert.equal(calls, FREE_NPC_MODELS.length);
  now = 60_001;
  available = true;
  assert.equal((await pool.generate('hello', signal())).status, 'ok');
});

test('malformed, oversized and control-character answers fail over safely', async () => {
  for (const response of [
    () => answer('bad\u202etext'),
    () => answer('x'.repeat(201)),
    () => Response.json({}),
    () => new Response('x'.repeat(40_000)),
  ]) {
    let calls = 0;
    const request: typeof fetch = async () => (++calls === 1 ? response() : answer('Good day.'));
    const result = await new FreeNpcModels(request, () => 0, undefined).generate('{}', signal());
    assert.deepEqual(result, { status: 'ok', text: 'Good day.' });
    assert.equal(calls, 2);
  }
});

test('concurrency is bounded and cancellation does not start more model attempts', async () => {
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    calls++;
    if (calls > 2) {
      assert.equal(JSON.parse(options?.body as string).model, FREE_NPC_MODELS[0]);
      return answer();
    }
    return new Promise((_resolve, reject) =>
      options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
        once: true,
      }),
    );
  };
  const pool = new FreeNpcModels(request, () => 0, undefined);
  const abort = new AbortController();
  const a = pool.generate('{}', abort.signal),
    b = pool.generate('{}', abort.signal);
  assert.deepEqual(await pool.generate('{}', signal()), { status: 'busy' });
  abort.abort();
  await Promise.all([a, b]);
  assert.equal(calls, 2);
  assert.equal((await pool.generate('{}', signal())).status, 'ok');
});

test('a timed out endpoint falls back within a bounded request deadline', async () => {
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    if (++calls > 1) return answer();
    return new Promise((_resolve, reject) => {
      const keepAlive = setTimeout(() => reject(new Error('test stalled')), 500);
      options?.signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(keepAlive);
          reject(new Error('timeout'));
        },
        { once: true },
      );
    });
  };
  const pool = new FreeNpcModels(request, () => 0, undefined, 10);
  assert.equal((await pool.generate('{}', signal())).status, 'ok');
  assert.equal(calls, 2);
});
