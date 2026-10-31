import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const cli = path.join(root, 'node_modules/oxlint/bin/oxlint');

test('spacing lint rejects dense code, fixes it and preserves braced guards', () => {
  const directory = mkdtempSync(path.join(tmpdir(), 'emberfall-spacing-'));
  const file = path.join(directory, 'spacing.ts');
  const lint = (...args: string[]) => {
    return spawnSync(
      process.execPath,
      [cli, '-c', path.join(root, '.oxlintrc.json'), file, ...args],
      {
        cwd: root,
        encoding: 'utf8',
      },
    );
  };

  try {
    writeFileSync(
      file,
      `export function finish(active: boolean) {
  if (!active) { return; }
  const value = 1;
  return value;
}
export function fail() {
  console.log('failure');
  throw new Error('failure');
}
export class Example {
  x = 1;
  y = 2;
  finish() { return this.x; }
  trim() { return this.y; }
}
`,
    );
    const before = lint();
    assert.equal(before.status, 1, before.stdout + before.stderr);
    assert.match(before.stdout + before.stderr, /padding-line-between-statements/);
    assert.match(before.stdout + before.stderr, /lines-between-class-members/);

    const fixed = lint('--fix');
    assert.equal(fixed.status, 0, fixed.stdout + fixed.stderr);
    const source = readFileSync(file, 'utf8');
    assert.match(source, /if \(!active\) \{ return; \}\n\n  const value/);
    assert.match(source, /const value = 1;\n\n  return value;/);
    assert.match(source, /}\n\nexport function fail/);
    assert.match(source, /console\.log\('failure'\);\n\n  throw/);
    assert.match(source, /x = 1;\n  y = 2;\n\n  finish/);
    assert.match(source, /finish\(\) { return this.x; }\n\n  trim/);
    assert.equal(lint().status, 0);
    assert.equal(lint('--fix').status, 0);
    assert.equal(readFileSync(file, 'utf8'), source);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
