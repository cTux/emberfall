import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('dispatch lint rejects equality cascades and accepts tables and guarded decisions', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const directory = mkdtempSync(path.join(tmpdir(), 'emberfall-dispatch-'));
  const config = path.join(directory, '.oxlintrc.json');
  const file = path.join(directory, 'dispatch.ts');
  writeFileSync(
    config,
    JSON.stringify({
      categories: { correctness: 'off' },
      jsPlugins: [path.join(root, 'scripts/dispatch-lint.mjs')],
      rules: { 'emberfall/prefer-dispatch': 'error' },
    }),
  );
  const lint = (source: string) => {
    writeFileSync(file, source);

    return spawnSync(
      process.execPath,
      [path.join(root, 'node_modules/oxlint/bin/oxlint'), '-c', config, '--format', 'json', file],
      { cwd: root, encoding: 'utf8' },
    );
  };

  try {
    const before = lint(`
      export function command(method: string) {
        if (method === 'arc') { return 1; }
        else if (method === 'moveTo') { return 2; }
        else if (method === 'lineTo') { return 3; }
        else if (method === 'closePath') { return 4; }
      }
      export function label(message: { type: string }) {
        return 'one' === message.type ? 1 : message.type === 'two' ? 2 : message.type === 'three' ? 3 : 0;
      }
      export function tier(value: number) {
        return value === 0 ? 'first' : value === 1 ? 'second' : value === 2 ? 'third' : 'last';
      }
    `);
    assert.equal(before.status, 1, before.stdout + before.stderr);
    const diagnostics = JSON.parse(before.stdout).diagnostics;
    assert.equal(diagnostics.length, 3, before.stdout);
    assert.ok(
      diagnostics.every((diagnostic: { code: string }) => {
        return diagnostic.code === 'emberfall(prefer-dispatch)';
      }),
    );

    const after = lint(`
      export function command(method: string) {
        const methods: Record<string, () => number> = { arc: () => 1, moveTo: () => 2 };
        return Object.hasOwn(methods, method) ? methods[method]() : 0;
      }
      export function guarded(method: string, ready: boolean) {
        if (method === 'one' && ready) { return 1; }
        else if (method === 'two') { return 2; }
        else if (method === 'three') { return 3; }
        return 0;
      }
      export function ranges(value: number, other: number) {
        return value < 0 ? 0 : value === 1 ? 1 : other === 2 ? 2 : value === 3 ? 3 : 4;
      }
      export function calls(read: () => string) {
        return read() === 'one' ? 1 : read() === 'two' ? 2 : read() === 'three' ? 3 : 0;
      }
      export function pair(value: string) {
        return value === 'one' ? 1 : value === 'two' ? 2 : 0;
      }
    `);
    assert.equal(after.status, 0, after.stdout + after.stderr);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
