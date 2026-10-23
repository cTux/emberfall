import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { OllamaNpcDialogue, DEFAULT_NPC_MODEL } from './npc-models.ts';
const signal = () => new AbortController().signal;
const answer = (content = 'Welcome, traveller!') =>
  Response.json({ message: { content }, done: true });
const defaults = { baseUrl: 'http://127.0.0.1:11434', model: DEFAULT_NPC_MODEL };
beforeEach((t) => {
  if ('mock' in t) t.mock.method(console, 'info', () => {});
});

test('native Ollama requests use local generation without API credentials', async () => {
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:11434/api/chat');
    assert.equal(options?.method, 'POST');
    assert.equal(new Headers(options?.headers).get('authorization'), null);
    const body = JSON.parse(options?.body as string);
    assert.equal(body.model, DEFAULT_NPC_MODEL);
    assert.equal(body.stream, false);
    assert.equal(body.keep_alive, '10m');
    assert.equal(body.options.num_predict, 96);
    assert.equal(body.options.num_ctx, 4096);
    assert.equal(body.messages[1].content, 'fictional context');
    assert.match(body.messages[0].content, /at most 200 characters/);
    return answer(' Good morning! ');
  };
  assert.deepEqual(
    await new OllamaNpcDialogue(request, () => 0, defaults).generate('fictional context', signal()),
    { status: 'ok', text: 'Good morning!' },
  );
});

test('server environment configures the provider used by runtime and diagnostic', async (t) => {
  const previous = { baseUrl: process.env.OLLAMA_BASE_URL, model: process.env.OLLAMA_MODEL };
  t.after(() => {
    if (previous.baseUrl === undefined) delete process.env.OLLAMA_BASE_URL;
    else process.env.OLLAMA_BASE_URL = previous.baseUrl;
    if (previous.model === undefined) delete process.env.OLLAMA_MODEL;
    else process.env.OLLAMA_MODEL = previous.model;
  });
  process.env.OLLAMA_BASE_URL = 'http://127.0.0.1:12345/';
  process.env.OLLAMA_MODEL = 'llama3.2:1b';
  const request: typeof fetch = async (url, options) => {
    assert.equal(url, 'http://127.0.0.1:12345/api/chat');
    assert.equal(JSON.parse(options?.body as string).model, 'llama3.2:1b');
    return answer();
  };
  assert.equal((await new OllamaNpcDialogue(request).generate('{}', signal())).status, 'ok');
});

test('HTTP failures honor Retry-After and recover without fallback or repeated logs', async (t) => {
  const lines: string[] = [];
  t.mock.method(console, 'info', (line: string) => lines.push(line));
  let now = 1000,
    calls = 0;
  const request: typeof fetch = async () =>
    ++calls === 1
      ? new Response('private response', { status: 503, headers: { 'Retry-After': '120' } })
      : answer();
  const pool = new OllamaNpcDialogue(request, () => now, defaults);
  assert.deepEqual(await pool.generate('{}', signal()), { status: 'unavailable' });
  now = 120_999;
  assert.deepEqual(await pool.generate('{}', signal()), { status: 'unavailable' });
  assert.equal(calls, 1);
  assert.equal(lines.length, 1);
  assert.match(lines[0], /"status":503/);
  assert.match(lines[0], /"retryMs":120000/);
  assert.match(lines[0], /"provider":"ollama"/);
  assert(!lines[0].includes('private'));
  now = 121_000;
  assert.equal((await pool.generate('{}', signal())).status, 'ok');
  assert.equal(calls, 2);
  assert.equal(lines.length, 2);
  assert.match(lines[1], /NPC dialogue provider recovered/);
  assert.match(lines[1], /"provider":"ollama"/);
  await pool.generate('{}', signal());
  assert.equal(lines.length, 2, 'healthy requests do not repeat recovery logs');
});

test('missing models and malformed, incomplete, oversized or invalid text fail safely', async () => {
  for (const response of [
    () => new Response('model not found', { status: 404 }),
    () => answer('bad\u202etext'),
    () => answer('bad\ntext'),
    () => answer('x'.repeat(201)),
    () => answer('  '),
    () => Response.json({ message: { content: 'Incomplete.' }, done: false }),
    () => Response.json(null),
    () => Response.json({ choices: [{ message: { content: 'Wrong API.' } }] }),
    () => new Response('x'.repeat(40_000)),
  ]) {
    const pool = new OllamaNpcDialogue(
      async () => response(),
      () => 0,
      defaults,
    );
    assert.deepEqual(await pool.generate('{}', signal()), { status: 'unavailable' });
  }
});

test('concurrency is bounded; cancellation releases slots without poisoning shared health', async (t) => {
  const log = t.mock.method(console, 'info', () => {});
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    if (++calls > 2) return answer();
    return new Promise((_resolve, reject) =>
      options?.signal?.addEventListener('abort', () => reject(new Error('aborted')), {
        once: true,
      }),
    );
  };
  const pool = new OllamaNpcDialogue(request, () => 0, defaults);
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
  t.mock.method(console, 'info', (line: string) => lines.push(line));
  for (const stallBody of [false, true]) {
    let now = 0,
      calls = 0;
    const request: typeof fetch = async (_url, options) => {
      if (++calls > 1) return answer();
      const keepAlive = setTimeout(() => {}, 500);
      if (stallBody)
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
    const pool = new OllamaNpcDialogue(request, () => now, { ...defaults, timeoutMs: 10 });
    assert.deepEqual(await pool.generate('{}', signal()), { status: 'unavailable' });
    assert.equal(calls, 1);
    now = 60_001;
    assert.equal((await pool.generate('{}', signal())).status, 'ok');
  }
  assert.equal(lines.length, 4);
  assert(lines.filter((line) => line.includes('"reason":"timeout"')).length === 2);
  assert(lines.filter((line) => line.includes('NPC dialogue provider recovered')).length === 2);
  assert(!lines.join('\n').includes('private'));
});

test('network diagnostics exclude arbitrary exception messages and codes', async (t) => {
  const lines: string[] = [];
  t.mock.method(console, 'info', (line: string) => lines.push(line));
  for (const code of ['ECONNREFUSED', 'private-key']) {
    const request: typeof fetch = async () => {
      throw new TypeError('private exception', { cause: { code } });
    };
    await new OllamaNpcDialogue(request, () => 0, defaults).generate('private prompt', signal());
  }
  assert.equal(lines.length, 2);
  assert.match(lines[0], /"networkCode":"ECONNREFUSED"/);
  assert.match(lines[0], /"timeoutMs":60000/);
  assert(!lines.join('\n').includes('private'));
});

test('invalid endpoints and cloud models are rejected before any request', () => {
  for (const baseUrl of [
    'file:///tmp',
    'https://user:secret@example.com',
    'http://localhost?secret=1',
  ])
    assert.throws(() => new OllamaNpcDialogue(fetch, Date.now, { ...defaults, baseUrl }));
  for (const model of ['', 'gemma4:cloud', 'model-cloud'])
    assert.throws(() => new OllamaNpcDialogue(fetch, Date.now, { ...defaults, model }));
});
