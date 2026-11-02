import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const packages = path.resolve(import.meta.dirname, '../packages');
const core = path.join(packages, 'core');

const forbiddenPackages: Record<string, readonly string[]> = {
  core: ['client', 'server', 'ui'],
  ui: ['core', 'client', 'server'],
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
    ]) {
      for (const dependency of forbidden) {
        assert.equal(
          manifest[section]?.[`@emberfall/${dependency}`],
          undefined,
          `${pkg}: ${dependency}`,
        );
      }
    }

    for (const file of readdirSync(path.join(root, 'src'), { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(file) || /\.(?:test|spec)\.tsx?$/.test(file)) {
        continue;
      }

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

const portableAreas: Record<string, readonly string[]> = {
  contracts: ['contracts'],
  geometry: ['geometry'],
  protocol: ['contracts', 'geometry', 'protocol'],
};

test('portable core entrypoints cannot initialize content, rules or bundled mods', () => {
  const manifest = JSON.parse(readFileSync(path.join(core, 'package.json'), 'utf8'));

  for (const [area, allowed] of Object.entries(portableAreas)) {
    const root = path.join(core, 'src', area);

    for (const file of readdirSync(root, { recursive: true, encoding: 'utf8' })) {
      if (!file.endsWith('.ts')) {
        continue;
      }

      const filename = path.join(root, file);
      const source = readFileSync(filename, 'utf8');

      for (const [, specifier] of source.matchAll(
        /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\brequire\s*\(\s*)['"]([^'"]+)['"]/g,
      )) {
        if (specifier === 'zod' || (area === 'protocol' && specifier === '@colyseus/schema')) {
          continue;
        }

        const exported = specifier.startsWith('@emberfall/core/')
          ? manifest.exports[specifier.replace('@emberfall/core/', './')]
          : undefined;
        const target = exported
          ? path.resolve(core, exported)
          : path.resolve(path.dirname(filename), specifier);
        assert.ok(
          (specifier.startsWith('.') || exported) &&
            allowed.some((directory) => {
              return target.startsWith(`${path.join(core, 'src', directory)}${path.sep}`);
            }),
          `${filename}: ${specifier} would escape the portable ${area} layer`,
        );
      }
    }
  }
});

test('TypeScript enums belong in core contracts', () => {
  for (const pkg of readdirSync(packages)) {
    const sourceRoot = path.join(packages, pkg, 'src');

    if (!existsSync(path.join(packages, pkg, 'package.json'))) {
      continue;
    }

    for (const file of readdirSync(sourceRoot, { recursive: true, encoding: 'utf8' })) {
      if (!/\.tsx?$/.test(file)) {
        continue;
      }

      const filename = path.join(sourceRoot, file);
      const source = readFileSync(filename, 'utf8');

      if (/\benum\s+\w+\s*\{/.test(source)) {
        assert.equal(pkg, 'core', filename);
        assert.ok(
          filename.startsWith(`${path.join(core, 'src', 'contracts')}${path.sep}`),
          filename,
        );
      }
    }
  }
});
