import { execFileSync } from 'node:child_process';

// Anchor to the versioning release so merges during implementation do not shift the starting version.
const VERSION_BASE = 'f173a29d3e8f4e53a72ce1769595c72a93a66489';
// The release introducing versioning is 1.0.375; every subsequent merge advances its patch once.
const INITIAL_PATCH = 375;

export function gameVersion(
  cwd: string | URL = new URL('../', import.meta.url),
  base = VERSION_BASE,
) {
  const releases = execFileSync('git', ['rev-list', '--first-parent', '--count', `${base}..HEAD`], {
    cwd,
    encoding: 'utf8',
  }).trim();

  return `1.0.${Number(releases) + INITIAL_PATCH}`;
}
