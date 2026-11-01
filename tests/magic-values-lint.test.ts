import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('numeric lint requires named tuning and rationale while preserving structural data', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const directory = mkdtempSync(path.join(tmpdir(), 'emberfall-values-'));
  const config = path.join(directory, '.oxlintrc.json');
  writeFileSync(
    config,
    JSON.stringify({
      categories: { correctness: 'off' },
      jsPlugins: [path.join(root, 'scripts/magic-values-lint.mjs')],
      rules: { 'emberfall-values/named-values': 'error' },
    }),
  );
  const lint = (source: string, filename = 'production.ts') => {
    const file = path.join(directory, filename);
    writeFileSync(file, source);
    const result = spawnSync(
      process.execPath,
      [path.join(root, 'node_modules/oxlint/bin/oxlint'), '-c', config, '--format', 'json', file],
      { cwd: root, encoding: 'utf8' },
    );
    assert.notEqual(result.status, null, result.stderr);

    return { result, diagnostics: JSON.parse(result.stdout).diagnostics as { message: string }[] };
  };

  try {
    for (const source of [
      'setTimeout(ping, 15_000);',
      'globalThis.setInterval(ping, 1);',
      'setTimeout(ping, 15 * 1000);',
      'setTimeout(ping, -15);',
      'setTimeout(ping, 15000 satisfies number);',
      "globalThis['setTimeout'](ping, 15000);",
      'page.waitForTimeout(15000);',
      'test.setTimeout(15000);',
      'export function full(count: number) { return count >= 32; }',
      'export const heartbeatMs = 15_000;',
      '// Limit retention during stalls.\nexport let heartbeatMs = 15_000;',
      'send(4096);',
    ]) {
      const { result, diagnostics } = lint(source);
      assert.equal(result.status, 1, source + result.stdout + result.stderr);
      assert.ok(diagnostics.length > 0, source);
    }

    const accepted = lint(`
      // Fifteen seconds tolerates transient network stalls before dropping a peer.
      export const heartbeatMs = 15_000;
      setTimeout(ping, heartbeatMs);
      setTimeout(ping, 0);
      const width = 640; // Match the source texture width.
      // Sixty angular sectors preserve the existing projectile spread.
      const spread = Math.PI / 30;
      const directions = [0, 1, 2, 3] as const;
      const colors = new Map([['red', 0xff0000]]);
      const style = { opacity: 0.8, width: 250 };
      export function geometry(size: number, values: number[]) {
        for (let index = 0; index < values.length; index++) { values[index] += 1; }
        ctx.ellipse(size * 0.58, -24, 50, 25, 0, 0, Math.PI * 2);
        return size / 2 + values[3];
      }
    `);
    assert.equal(accepted.result.status, 0, accepted.result.stdout + accepted.result.stderr);

    const fixture = lint('assert.equal(value, 15000); setTimeout(ping, 15000);', 'example.test.ts');
    assert.equal(fixture.result.status, 1, fixture.result.stdout);
    assert.equal(fixture.diagnostics.length, 1, fixture.result.stdout);
    assert.match(fixture.diagnostics[0].message, /15000/);
    assert.equal(lint('page.waitForTimeout(15000);', 'example.spec.ts').diagnostics.length, 1);
    assert.equal(lint('test.setTimeout(15000);', 'example.spec.ts').diagnostics.length, 1);
    assert.equal(
      lint('setTimeout(ping, 15000 satisfies number);', 'example.test.ts').diagnostics.length,
      1,
    );
    assert.equal(
      lint("globalThis['setTimeout'](ping, 15000);", 'example.test.ts').diagnostics.length,
      1,
    );
    assert.equal(
      lint('const view = <Tooltip leaveDelay={250} />;', 'example.test.tsx').diagnostics.length,
      1,
    );
    assert.equal(
      lint('const view = <Tooltip enterDelay={0} />;', 'example.test.tsx').diagnostics.length,
      0,
    );

    for (const source of [
      'setTimeout(ping, <number>15000);',
      'setTimeout(ping, ready ? 15000 : 20000);',
      'setTimeout(ping, Math.max(15000, wait));',
    ]) {
      assert.ok(lint(source, 'wrapped.test.ts').diagnostics.length > 0, source);
    }

    assert.equal(
      lint('setTimeout(() => { assert.equal(value, 15000); }, delay);', 'callback.test.ts')
        .diagnostics.length,
      0,
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
