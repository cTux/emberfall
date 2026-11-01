import { clientAsset } from './urls.ts';
import { VERSION_REQUEST_TIMEOUT_MS } from './session-timing.ts';

export async function clientBuild(signal: AbortSignal): Promise<string> {
  const response = await fetch(clientAsset('/version.json'), {
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(VERSION_REQUEST_TIMEOUT_MS)]),
  });

  if (!response.ok) {
    throw new Error('Version check unavailable');
  }

  const { buildId } = await response.json();

  if (typeof buildId !== 'string' || !buildId) {
    throw new Error('Invalid build ID');
  }

  return buildId;
}
