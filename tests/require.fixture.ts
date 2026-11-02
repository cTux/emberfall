import { createRequire } from 'node:module';
import { resolve } from 'node:path';

export const require = createRequire(resolve('packages/client/package.json'));
