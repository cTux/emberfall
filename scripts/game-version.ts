import { execFileSync } from 'node:child_process';

// The next merge starts at 1.0.375; each first-parent main commit represents one merged release.
const VERSION_BASE = 'dfd10970022802bdc849a14049b9e2af6f1bde06';
// Main predates versioning; treating it as 374 makes this feature's first merge 375.
const INITIAL_PATCH = 374;

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
