import type { BrowserSelection } from './browser-selection-contract.ts';
import { full } from './full.ts';
import { selectBrowserTests } from './select-browser-tests.ts';

export function selectionForEvent(
  eventName: string,
  event: {
    pull_request?: { base: { sha: string }; head: { sha: string } };
  },
  diff: (range: string) => string[],
): BrowserSelection {
  if (eventName === 'workflow_dispatch') {
    return full('Explicit full desktop regression run');
  }

  const base = event.pull_request?.base.sha;
  const head = event.pull_request?.head.sha;

  if (
    !base ||
    !head ||
    !/^[a-f0-9]{40}$/.test(base) ||
    !/^[a-f0-9]{40}$/.test(head) ||
    /^0+$/.test(base)
  ) {
    return full('Changed commit range unavailable');
  }

  try {
    return selectBrowserTests(diff(`${base}...${head}`));
  } catch {
    return full('Changed commit range could not be read');
  }
}
