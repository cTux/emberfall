import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gameVersion } from '../scripts/game-version.ts';

test('game versions advance once per first-parent commit, ignoring feature branch commits', () => {
  const root = mkdtempSync(join(tmpdir(), 'emberfall-version-'));
  const git = (...args: string[]) => {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
  };

  try {
    git('init', '--initial-branch=main');
    git('config', 'user.name', 'Version test');
    git('config', 'user.email', 'version@example.invalid');
    writeFileSync(join(root, 'release'), 'base');
    git('add', '.');
    git('commit', '-m', 'base');
    const base = git('rev-parse', 'HEAD');
    assert.equal(gameVersion(root, base), '1.0.374');
    git('checkout', '-b', 'feature');
    git('commit', '--allow-empty', '-m', 'first');
    git('commit', '--allow-empty', '-m', 'second');
    git('checkout', 'main');
    git('merge', '--no-ff', 'feature', '-m', 'merge');
    assert.equal(gameVersion(root, base), '1.0.375');
    git('commit', '--allow-empty', '-m', 'next squash merge');
    assert.equal(gameVersion(root, base), '1.0.376');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
