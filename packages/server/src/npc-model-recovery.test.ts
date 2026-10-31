import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { OllamaNpcDialogue } from './npc-models.ts';
import { signal, answer, defaults } from './npc-models.fixture.ts';

beforeEach((t) => {
  if ('mock' in t) t.mock.method(console, 'info', () => {});
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
    () => answer('bad\u0000text'),
    () => answer('x'.repeat(32_769)),
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

test('invalid response diagnostics identify validation failures without exposing speech', async (t) => {
  const lines: string[] = [];
  t.mock.method(console, 'info', (line: string) => lines.push(line));
  const cases: [() => Response, string][] = [
    [() => new Response(null), 'missing_body'],
    [() => new Response('private malformed JSON'), 'invalid_json'],
    [() => new Response('x'.repeat(40_000)), 'response_too_large'],
    [() => Response.json({ message: { content: 'private' }, done: false }), 'incomplete'],
    [() => Response.json({ done: true }), 'missing_text'],
    [() => answer('  '), 'empty_text'],
    [() => answer('private\u202etext'), 'control_characters'],
    [() => answer(`${'safe '.repeat(50)}private\u202etext`), 'control_characters'],
  ];
  for (const [response, failure] of cases) {
    const pool = new OllamaNpcDialogue(
      async () => response(),
      () => 0,
      defaults,
    );
    assert.deepEqual(await pool.generate('private prompt', signal()), { status: 'unavailable' });
    const entry = lines.at(-1)!;
    assert.match(entry, /"reason":"invalid_response"/);
    assert(entry.includes(`"validationFailure":"${failure}"`), entry);
  }

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
