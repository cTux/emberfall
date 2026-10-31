import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { OllamaNpcDialogue, DEFAULT_NPC_MODEL, spokenLine } from './npc-models.ts';
import { signal, answer, defaults } from './npc-models.fixture.ts';

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
    assert.equal(body.options.num_predict, 64);
    assert.equal(body.options.num_ctx, 4096);
    assert.equal(body.messages[1].content, 'fictional context');
    assert.match(body.messages[0].content, /at most 120 characters/);
    assert.match(body.messages[0].content, /fantasy humor/);
    assert.match(body.messages[0].content, /personality shape your vocabulary, rhythm, opinions/);
    assert.match(body.messages[0].content, /amusing twist in most lines/);
    assert.match(body.messages[0].content, /Answer the actual question while being funny/);
    assert.match(body.messages[0].content, /do not copy them verbatim/);
    assert.match(body.messages[0].content, /Prefix every mentioned resident name with @/);

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

test('usable model speech is folded to one complete line without cooling down', async (t) => {
  const log = t.mock.method(console, 'info', () => {});
  const long = 'Welcome to our village, traveller. '.repeat(10);
  for (const [content, expected] of [
    ['Good morning!\r\n\tWelcome, traveller.', 'Good morning! Welcome, traveller.'],
    [long, long.trim()],
    ['x'.repeat(201), 'x'.repeat(201)],
    ['“The forest goblins call this "fine dining".”', 'The forest goblins call this fine dining.'],
    ["'Don't feed the goblins.'", "Don't feed the goblins."],
    ['‘Nell’s boots fear no mud.’', 'Nell’s boots fear no mud.'],
  ]) {
    let calls = 0;
    const pool = new OllamaNpcDialogue(
      async () => {
        calls++;

        return answer(content);
      },
      () => 0,
      defaults,
    );
    assert.deepEqual(await pool.generate('{}', signal()), { status: 'ok', text: expected });
    assert.equal((await pool.generate('{}', signal())).status, 'ok');
    assert.equal(calls, 2, 'usable replies must not start a shared cooldown');
  }

  assert.equal(log.mock.callCount(), 0);
});

test('spoken text remains bounded even for injected dialogue providers', () => {
  assert.throws(() => spokenLine('x'.repeat(32_769)));
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
