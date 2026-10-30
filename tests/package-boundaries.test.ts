import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packages = path.resolve(import.meta.dirname, '../packages');
const common = path.join(packages, 'common');
const core = path.join(packages, 'core');

const forbiddenPackages: Record<string, readonly string[]> = {
  common: ['core', 'client', 'server', 'ui'],
  core: ['client', 'server', 'ui'],
  ui: ['common', 'core', 'client', 'server'],
  client: ['server'],
  server: ['client', 'ui'],
};

test('workspace packages preserve their documented dependency direction', () => {
  for (const [pkg, forbidden] of Object.entries(forbiddenPackages)) {
    const root = path.join(packages, pkg);
    const manifest = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    for (const section of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ])
      for (const dependency of forbidden)
        assert.equal(
          manifest[section]?.[`@emberfall/${dependency}`],
          undefined,
          `${pkg}: ${dependency}`,
        );
    for (const file of readdirSync(path.join(root, 'src'), { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(file) || /\.(?:test|spec)\.tsx?$/.test(file)) continue;
      const filename = path.join(root, 'src', file);
      const source = readFileSync(filename, 'utf8');
      for (const [, specifier] of source.matchAll(
        /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g,
      )) {
        for (const dependency of forbidden) {
          assert.ok(
            !specifier.startsWith(`@emberfall/${dependency}/`) &&
              specifier !== `@emberfall/${dependency}`,
            `${filename}: ${specifier}`,
          );
          if (specifier.startsWith('.')) {
            const target = path.resolve(path.dirname(filename), specifier);
            const forbiddenRoot = path.join(packages, dependency);
            assert.ok(
              target !== forbiddenRoot && !target.startsWith(`${forbiddenRoot}${path.sep}`),
              `${filename}: ${specifier}`,
            );
          }
        }
      }
    }
  }
});

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
