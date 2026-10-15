import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packages = path.resolve(import.meta.dirname, '../packages');
const common = path.join(packages, 'common');
const core = path.join(packages, 'core');

test('common cannot depend on core, and TypeScript enums belong in common', () => {
  const manifest = JSON.parse(readFileSync(path.join(common, 'package.json'), 'utf8'));
  for (const section of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    assert.equal(manifest[section]?.['@emberfall/core'], undefined);
  }

  for (const pkg of readdirSync(packages)) {
    const sourceRoot = path.join(packages, pkg, 'src');
    for (const file of readdirSync(sourceRoot, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(file)) continue;
      const filename = path.join(sourceRoot, file);
      const source = readFileSync(filename, 'utf8');
      if (/\benum\s+\w+\s*\{/.test(source)) assert.equal(pkg, 'common', filename);
      if (pkg !== 'common') continue;
      for (const [, specifier] of source.matchAll(
        /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g,
      )) {
        assert.ok(!/^@emberfall\/core(?:\/|$)/.test(specifier), filename);
        if (specifier.startsWith('.')) {
          const target = path.resolve(path.dirname(filename), specifier);
          assert.ok(target !== core && !target.startsWith(`${core}${path.sep}`), filename);
        }
      }
    }
  }
});
