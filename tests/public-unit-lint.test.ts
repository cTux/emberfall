import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('public-unit lint counts implementations while allowing supporting types and re-exports', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const directory = mkdtempSync(path.join(tmpdir(), 'emberfall-public-unit-'));
  const config = path.join(directory, '.oxlintrc.json');
  const file = path.join(directory, 'unit.tsx');
  writeFileSync(
    config,
    JSON.stringify({
      categories: { correctness: 'off' },
      jsPlugins: [path.join(root, 'scripts/public-unit-lint.mjs')],
      rules: { 'emberfall-structure/one-public-unit': 'error' },
    }),
  );
  const lint = (source: string) => {
    writeFileSync(file, source);
    const result = spawnSync(
      process.execPath,
      [path.join(root, 'node_modules/oxlint/bin/oxlint'), '-c', config, '--format', 'json', file],
      { cwd: root, encoding: 'utf8' },
    );
    assert.equal(result.error, undefined);

    return {
      status: result.status,
      output: result.stdout + result.stderr,
      diagnostics: JSON.parse(result.stdout).diagnostics,
    };
  };

  try {
    for (const source of [
      'export function one() {} export function two() {}',
      'export const one = () => {}; export const two = () => {};',
      'export const one = 1, two = 2;',
      'export const { one, nested: { two }, ...rest } = source;',
      'const one = 1; const two = 2; export { one, two as other };',
      'export default function One() {} export class Two {}',
      'export enum One { A } export const two = 2;',
      'export const schema = z.object({}); export const parse = () => {};',
      'export const One = () => <div />; export const Two = () => <div />;',
      'export const One = schema({}); export type One = typeof One; export const Two = schema({}); export type Two = typeof Two;',
      'const one = schema({}); type one = typeof one; const two = schema({}); type two = typeof two; export { one, two };',
    ]) {
      const result = lint(source);
      assert.equal(result.status, 1, result.output);
      assert.equal(result.diagnostics.length, 1, result.output);
      assert.equal(result.diagnostics[0].code, 'emberfall-structure(one-public-unit)');
    }

    for (const source of [
      'export interface Props { value: number } export type Result = number; export function one(props: Props): Result { return props.value; }',
      'export interface Contract { value: number } export type Other = string;',
      'function helper() {} export function one() { helper(); }',
      'export { one, two } from "./units"; export * from "./more"; export const local = 1;',
      'import { one, two } from "./units"; export { one, two };',
      'import One from "./one"; export default One; export const local = 1;',
      'type Props = {}; const one = 1; export { one, type Props };',
      'const one = 1; export { one, one as other }; export default one;',
      'export const One = () => <div />; export type OneProps = {};',
      'export const One = schema({}); export type One = typeof One;',
    ]) {
      const result = lint(source);
      assert.equal(result.status, 0, result.output);
      assert.equal(result.diagnostics.length, 0, result.output);
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
